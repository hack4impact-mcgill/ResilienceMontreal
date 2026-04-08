import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Prisma } from "~/generated/prisma/client";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const expensesRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        fundPoolId: z.coerce.number().int().positive().optional(),  // optional for now, since we don't have the frontend done yet. TODO: make it required later.
        totalAmount: z.coerce.number(),
        description: z.string().min(1),
        date: z.coerce.date(),
        invoiceUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const totalAmount = new Prisma.Decimal(String(input.totalAmount));

      // TODO: once the frontend is done, we can remove this and make fundPoolId required. associated with task https://h4i-mcgill.atlassian.net/browse/RM-116
      if (input.fundPoolId === undefined) {
        const expense = await ctx.db.expense.create({
          data: {
            totalAmount,
            description: input.description,
            date: input.date,
            invoiceUrl: input.invoiceUrl ?? undefined,
          },
        });
        return { expense };
      }

      const now = new Date();
      const candidateDistributions = await ctx.db.grantDistribution.findMany({
        where: {
          fundPoolId: input.fundPoolId,
          grant: {
            status: "APPROVED",
            OR: [{ endDate: null }, { endDate: { gte: now } }],
          },
        },
        select: {
          id: true,
          amount: true,
          spentAmount: true,
          grant: {
            select: {
              endDate: true,
            },
          },
        },
      });

      const sortedCandidates = [...candidateDistributions].sort((a, b) => {
        const aTs = a.grant.endDate?.getTime() ?? Number.MIN_SAFE_INTEGER;
        const bTs = b.grant.endDate?.getTime() ?? Number.MIN_SAFE_INTEGER;
        if (bTs !== aTs) return bTs - aTs;
        return a.id - b.id;
      });

      const allocations: Array<{ grantDistributionId: number; amount: Prisma.Decimal }> = [];
      let remaining = totalAmount;
      let totalAvailable = new Prisma.Decimal(0);

      for (const distribution of sortedCandidates) {
        const available = new Prisma.Decimal(String(distribution.amount)).minus(
          new Prisma.Decimal(String(distribution.spentAmount)),
        );

        if (available.lte(0)) continue;

        totalAvailable = totalAvailable.plus(available);

        if (remaining.lte(0)) continue;

        const takeAmount = Prisma.Decimal.min(available, remaining);
        allocations.push({
          grantDistributionId: distribution.id,
          amount: takeAmount,
        });
        remaining = remaining.minus(takeAmount);
      }

      if (totalAvailable.lessThan(totalAmount) || remaining.gt(0)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Insufficient available funds in selected fund pool",
        });
      }

      const expense = await ctx.db.$transaction(async (tx) => {
        const createdExpense = await tx.expense.create({
          data: {
            totalAmount,
            description: input.description,
            date: input.date,
            invoiceUrl: input.invoiceUrl ?? undefined,
          },
        });

        await tx.expenseDistribution.createMany({
          data: allocations.map((allocation) => ({
            expenseId: createdExpense.id,
            grantDistributionId: allocation.grantDistributionId,
            amount: allocation.amount,
          })),
        });

        for (const allocation of allocations) {
          await tx.grantDistribution.update({
            where: { id: allocation.grantDistributionId },
            data: {
              spentAmount: {
                increment: allocation.amount,
              },
            },
          });
        }

        return tx.expense.findUniqueOrThrow({
          where: { id: createdExpense.id },
          include: {
            distributions: {
              include: {
                grantDistribution: {
                  include: {
                    grant: {
                      select: {
                        id: true,
                        title: true,
                        endDate: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });
      });

      return { expense };
    }),

  list: publicProcedure
    .input(
      z
        .object({
          page: z.coerce.number().int().min(1).default(1),
          limit: z.coerce.number().int().min(1).max(100).default(10),
        })
        .default({ page: 1, limit: 10 }),
    )
    .query(async ({ ctx, input }) => {
      const page = input.page ?? 1;
      const limit = input.limit ?? 10;
      const skip = (page - 1) * limit;

      const [expenses, total] = await Promise.all([
        ctx.db.expense.findMany({
          skip,
          take: limit,
          orderBy: { date: "desc" },
        }),
        ctx.db.expense.count(),
      ]);

      return {
        expenses,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),
});
