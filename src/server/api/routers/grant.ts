import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { Prisma } from "~/generated/prisma/client";
import {
  createGrantFullSchema,
  updateGrantFullSchema,
  grantQuerySchema,
} from "~/lib/schemas/grant";
import { TRPCError } from "@trpc/server";

// Use existing schema fields. Workarounds:
// - Store extra grant metadata (category, dates, email, phone, notes) inside Grant.description as JSON.
// - Treat FundPool.amount as the total amount allocated to that pool (add on create, deduct back on delete).

const grantInclude = {
  distributions: { include: { fundPool: true } },
} as const;

export const grantRouter = createTRPCRouter({
  // getAll - public: return all grants with distributions
  // make this public so the Grants page doesn't hard-fail for unauthenticated visitors
  getAll: publicProcedure.query(async ({ ctx }) => {
    const grants = await ctx.db.grant.findMany({ include: grantInclude });
    return grants;
  }),

  // create - transactional: create grant, create one GrantDistribution linking to fundPool, add to fund pool amount
  create: protectedProcedure
    .input(createGrantFullSchema)
    .mutation(async ({ ctx, input }) => {
      const amount = new Prisma.Decimal(String(input.amount));

      return await ctx.db.$transaction(async (tx) => {
        const fundPool = await tx.fundPool.findUnique({
          where: { id: input.fundPoolId },
        });
        if (!fundPool) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Fund pool not found",
          });
        }

        const descriptionObj = {
          notes: input.notes ?? null,
          category: input.category,
          dateReceived: input.dateReceived.toISOString(),
          toBeUsedBy: input.toBeUsedBy.toISOString(),
          email: input.email ?? null,
          phoneNumber: input.phoneNumber ?? null,
        };

        const createdGrant = await tx.grant.create({
          data: {
            title: input.organization,
            description: JSON.stringify(descriptionObj),
            totalAmount: amount,
            unassignedAmount: amount,
            status: "APPROVED",
            endDate: input.toBeUsedBy,
          },
        });

        // create a single distribution for this grant
        await tx.grantDistribution.create({
          data: {
            grantId: createdGrant.id,
            fundPoolId: input.fundPoolId,
            amount: amount,
          },
        });

        // add the grant amount to fundPool.amount
        await tx.fundPool.update({
          where: { id: input.fundPoolId },
          data: {
            amount: new Prisma.Decimal(String(fundPool.amount)).plus(amount),
          },
        });

        const result = await tx.grant.findUnique({
          where: { id: createdGrant.id },
          include: grantInclude,
        });
        return result;
      });
    }),

  // update - update grant metadata, optionally amount, and optionally move distribution to another fund pool
  update: protectedProcedure
    .input(updateGrantFullSchema)
    .mutation(async ({ ctx, input }) => {
      const {
        id,
        amount: newAmountRaw,
        fundPoolId: newFundPoolId,
        ...rest
      } = input;
      const newAmount =
        newAmountRaw !== undefined
          ? new Prisma.Decimal(String(newAmountRaw))
          : undefined;

      // if only metadata changes (no amount and no fundPoolId changes)
      if (newAmount === undefined && newFundPoolId === undefined) {
        const grant = await ctx.db.grant.findUnique({ where: { id } });
        if (!grant)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Grant not found",
          });

        let descriptionObj: Record<string, unknown> = {};
        try {
          descriptionObj = grant.description
            ? (JSON.parse(grant.description) as Record<string, unknown>)
            : {};
        } catch {
          descriptionObj = { notes: grant.description };
        }

        if (rest.organization !== undefined) {
          await ctx.db.grant.update({
            where: { id },
            data: { title: rest.organization },
          });
        }

        const allowedMeta = [
          "category",
          "dateReceived",
          "toBeUsedBy",
          "email",
          "phoneNumber",
          "notes",
        ] as const;
        let didMeta = false;
        for (const k of allowedMeta) {
          const value = rest[k];
          if (value !== undefined) {
            descriptionObj[k] = value;
            didMeta = true;
          }
        }

        if (didMeta) {
          await ctx.db.grant.update({
            where: { id },
            data: {
              description: JSON.stringify(descriptionObj),
              ...(rest.toBeUsedBy !== undefined
                ? { endDate: rest.toBeUsedBy }
                : {}),
            },
          });
        }

        const updated = await ctx.db.grant.findUnique({
          where: { id },
          include: grantInclude,
        });
        return updated;
      }

      // handle amount or fundPool changes transactionally
      return await ctx.db.$transaction(async (tx) => {
        const grant = await tx.grant.findUnique({
          where: { id },
          include: { distributions: true },
        });
        if (!grant)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Grant not found",
          });

        const distributions = grant.distributions || [];
        if (distributions.length > 1) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "Multiple distributions found for grant (splitting not supported)",
          });
        }

        const oldAmount = new Prisma.Decimal(String(grant.totalAmount));
        const amountToSet = newAmount ?? oldAmount;
        const diff = amountToSet.minus(oldAmount); // positive => need to add more to pool

        // if there's no existing distribution but client provides a fundPoolId, create one
        if (distributions.length === 0) {
          if (!newFundPoolId) {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "No distribution exists for grant; provide fundPoolId to associate",
            });
          }

          const newFundPool = await tx.fundPool.findUnique({
            where: { id: newFundPoolId },
          });
          if (!newFundPool)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Fund pool not found",
            });

          // add the full amount to the new pool
          await tx.grantDistribution.create({
            data: {
              grantId: grant.id,
              fundPoolId: newFundPoolId,
              amount: amountToSet,
            },
          });
          await tx.fundPool.update({
            where: { id: newFundPoolId },
            data: {
              amount: new Prisma.Decimal(String(newFundPool.amount)).plus(
                amountToSet,
              ),
            },
          });
        } else {
          // there is an existing single distribution
          const dist = distributions[0];
          const currentFundPoolId = dist.fundPoolId;
          if (currentFundPoolId == null)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Fund pool not found",
            });
          const currentFundPool = await tx.fundPool.findUnique({
            where: { id: currentFundPoolId },
          });
          if (!currentFundPool)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Fund pool not found",
            });

          // if fundPoolId is changing, move funds between pools
          if (
            newFundPoolId !== undefined &&
            newFundPoolId !== dist.fundPoolId
          ) {
            const targetPool = await tx.fundPool.findUnique({
              where: { id: newFundPoolId },
            });
            if (!targetPool)
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Target fund pool not found",
              });

            // ensure the source pool has enough to remove
            const sourceAmount = new Prisma.Decimal(
              String(currentFundPool.amount),
            );
            if (sourceAmount.lessThan(amountToSet)) {
              throw new TRPCError({
                code: "CONFLICT",
                message: "Insufficient amount in source fund pool to remove",
              });
            }

            // subtract from old pool
            await tx.fundPool.update({
              where: { id: currentFundPool.id },
              data: {
                amount: sourceAmount.minus(amountToSet),
              },
            });

            // add to new pool (no insufficiency check – we are increasing total)
            await tx.fundPool.update({
              where: { id: targetPool.id },
              data: {
                amount: new Prisma.Decimal(String(targetPool.amount)).plus(
                  amountToSet,
                ),
              },
            });

            // update distribution to point to new pool and amount
            await tx.grantDistribution.update({
              where: { id: dist.id },
              data: { fundPoolId: newFundPoolId, amount: amountToSet },
            });
          } else {
            // same pool: adjust by diff (positive => add to pool, negative => subtract)
            const poolOld = new Prisma.Decimal(String(currentFundPool.amount));
            const newPoolAmount = poolOld.plus(diff); // diff can be positive or negative

            if (newPoolAmount.lessThan(0)) {
              throw new TRPCError({
                code: "CONFLICT",
                message: "Operation would make fund pool total negative",
              });
            }

            await tx.grantDistribution.update({
              where: { id: dist.id },
              data: { amount: amountToSet },
            });
            await tx.fundPool.update({
              where: { id: currentFundPool.id },
              data: {
                amount: newPoolAmount,
              },
            });
          }
        }

        // update grant totals
        const newUnassigned = new Prisma.Decimal(
          String(grant.unassignedAmount),
        ).plus(diff);
        await tx.grant.update({
          where: { id },
          data: { totalAmount: amountToSet, unassignedAmount: newUnassigned },
        });

        // also handle metadata updates
        if (
          rest.organization ||
          rest.category ||
          rest.notes ||
          rest.dateReceived ||
          rest.toBeUsedBy ||
          rest.email ||
          rest.phoneNumber
        ) {
          const current = await tx.grant.findUnique({ where: { id } });
          let descriptionObj: Record<string, unknown> = {};
          try {
            descriptionObj = current?.description
              ? (JSON.parse(current.description) as Record<string, unknown>)
              : {};
          } catch {
            descriptionObj = { notes: current?.description };
          }
          const fieldsToMap: Record<string, unknown> = {
            category: rest.category,
            dateReceived: rest.dateReceived,
            toBeUsedBy: rest.toBeUsedBy,
            email: rest.email,
            phoneNumber: rest.phoneNumber,
            notes: rest.notes,
          };
          for (const k of Object.keys(fieldsToMap)) {
            if (fieldsToMap[k] !== undefined)
              descriptionObj[k] = fieldsToMap[k];
          }
          const endDatePatch =
            rest.toBeUsedBy !== undefined
              ? { endDate: rest.toBeUsedBy as Date }
              : {};
          if (rest.organization !== undefined) {
            await tx.grant.update({
              where: { id },
              data: {
                title: rest.organization,
                description: JSON.stringify(descriptionObj),
                ...endDatePatch,
              },
            });
          } else {
            await tx.grant.update({
              where: { id },
              data: {
                description: JSON.stringify(descriptionObj),
                ...endDatePatch,
              },
            });
          }
        }

        const updated = await tx.grant.findUnique({
          where: { id },
          include: grantInclude,
        });
        return updated;
      });
    }),

  // delete - restore funds to associated fund pools, delete distribution(s) and grant transactionally
  delete: protectedProcedure
    .input(
      z.object({
        id: z.coerce
          .number()
          .int()
          .positive("GrantID must be a positive integer"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        const grant = await tx.grant.findUnique({
          where: { id: input.id },
          include: { distributions: true },
        });
        if (!grant)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Grant not found",
          });

        const distributions = grant.distributions || [];
        for (const d of distributions) {
          const fundPoolId = d.fundPoolId;
          if (fundPoolId == null)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Fund pool not found",
            });
          const fundPool = await tx.fundPool.findUnique({
            where: { id: fundPoolId },
          });
          if (!fundPool)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Fund pool not found",
            });

          const available = new Prisma.Decimal(String(fundPool.amount));
          await tx.fundPool.update({
            where: { id: fundPool.id },
            data: {
              amount: available.minus(new Prisma.Decimal(String(d.amount))),
            },
          });

          await tx.grantDistribution.delete({ where: { id: d.id } });
        }

        const deleted = await tx.grant.delete({ where: { id: input.id } });
        return deleted;
      });
    }),

  // Endpoint to fetch grants with filtering, sorting, and pagination
  // Example: GET http://localhost:3000/api/trpc/grant.getGrants?input={"json":{"page":1,"limit":30,"sortBy":"createdAt","sortOrder":"desc"}}
  getGrants: publicProcedure
    .input(grantQuerySchema.optional())
    .query(async ({ ctx, input }) => {
      const {
        page = 1,
        limit = 30,
        sortBy = "createdAt",
        sortOrder = "desc",
        title,
        minAmount,
        maxAmount,
        startDate,
        endDate,
        status,
      } = input ?? {};

      const where: Prisma.GrantWhereInput = {};

      if (title) {
        where.title = {
          contains: title,
          mode: "insensitive",
        };
      }

      if (minAmount !== undefined || maxAmount !== undefined) {
        where.totalAmount = {};
        if (minAmount !== undefined) {
          where.totalAmount.gte = new Prisma.Decimal(minAmount);
        }
        if (maxAmount !== undefined) {
          where.totalAmount.lte = new Prisma.Decimal(maxAmount);
        }
      }

      if (startDate !== undefined || endDate !== undefined) {
        where.endDate = {};
        if (startDate !== undefined) {
          where.endDate.gte = startDate;
        }
        if (endDate !== undefined) {
          where.endDate.lte = endDate;
        }
      }

      if (status) {
        where.status = status;
      }

      const skip = (page - 1) * limit;

      const orderBy: Prisma.GrantOrderByWithRelationInput = {
        [sortBy]: sortOrder,
      };

      const [grants, totalCount] = await Promise.all([
        ctx.db.grant.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: { ...grantInclude },
        }),
        ctx.db.grant.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        grants,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalCount,
          totalPages,
          hasNextPage,
          hasPreviousPage,
          returnedCount: grants.length,
        },
      };
    }),
});
