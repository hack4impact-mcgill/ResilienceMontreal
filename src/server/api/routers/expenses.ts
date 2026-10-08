import { z } from "zod";
import { Prisma } from "~/generated/prisma/client";

import {
  buildGreedyAllocations,
  expenseListInclude,
  fetchActiveDistributions,
  persistExpenseWithAllocations,
  validateCustomAllocations,
} from "~/server/api/lib/expense-allocation";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  fundPoolReadProcedure,
  interventionTeamProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import { expenseListQuerySchema } from "~/lib/schemas/expense";

const customDistributionSchema = z.object({
  grantDistributionId: z.number().int().positive(),
  amount: z.coerce.number().positive(),
});

const createExpenseInputSchema = z
  .object({
    fundPoolId: z.coerce.number().int().positive(),
    totalAmount: z.coerce.number().positive(),
    description: z.string().min(1),
    date: z.coerce.date(),
    invoiceUrl: z.string().url().optional(),
    clientId: z.coerce.number().int().positive().optional(),
    customDistributions: z.array(customDistributionSchema).optional(),
  })
  .refine(
    (data) => {
      if (!data.customDistributions?.length) return true;
      const ids = data.customDistributions.map(
        (row) => row.grantDistributionId,
      );
      return ids.length === new Set(ids).size;
    },
    {
      message: "Duplicate grantDistributionId in customDistributions",
      path: ["customDistributions"],
    },
  );

const updateExpenseInputSchema = z
  .object({
    id: z.coerce.number().int().positive(),
    description: z.string().trim().min(1).optional(),
    date: z.coerce.date().optional(),
    invoiceUrl: z
      .union([
        z.string().trim().url("Invoice URL must be a valid URL"),
        z.literal(""),
        z.null(),
      ])
      .optional(),
    totalAmount: z.coerce.number().positive().optional(),
    fundPoolId: z.coerce.number().int().positive().optional(),
  })
  .refine((data) => Object.keys(data).length > 1, {
    message: "At least one field to update must be provided",
  });

export const expensesRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createExpenseInputSchema)
    .mutation(async ({ ctx, input }) => {
      const totalAmount = new Prisma.Decimal(String(input.totalAmount));
      const now = new Date();

      if (input.clientId !== undefined) {
        const client = await ctx.db.client.findUnique({
          where: { id: input.clientId },
          select: { id: true },
        });
        if (!client) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selected client does not exist",
          });
        }
      }

      const allocations = input.customDistributions?.length
        ? await validateCustomAllocations(ctx.db, {
            fundPoolId: input.fundPoolId,
            totalAmount,
            customDistributions: input.customDistributions,
            now,
          })
        : buildGreedyAllocations(
            await fetchActiveDistributions(ctx.db, input.fundPoolId, now),
            totalAmount,
          );

      const expense = await ctx.db.$transaction(async (tx) =>
        persistExpenseWithAllocations(
          tx,
          {
            totalAmount,
            description: input.description,
            date: input.date,
            invoiceUrl: input.invoiceUrl,
            clientId: input.clientId,
          },
          allocations,
        ),
      );

      return { expense };
    }),

  list: protectedProcedure
    .input(expenseListQuerySchema.optional())
    .query(async ({ ctx, input }) => {
      const {
        page = 1,
        limit = 30,
        sortBy = "date",
        sortOrder = "desc",
        description,
        minAmount,
        maxAmount,
        startDate,
        endDate,
      } = input ?? {};

      const where: Prisma.ExpenseWhereInput = {};

      if (description?.trim()) {
        where.description = {
          contains: description.trim(),
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
        where.date = {};
        if (startDate !== undefined) {
          where.date.gte = startDate;
        }
        if (endDate !== undefined) {
          where.date.lte = endDate;
        }
      }

      const skip = (page - 1) * limit;

      const orderBy: Prisma.ExpenseOrderByWithRelationInput = {
        [sortBy]: sortOrder,
      };

      const [expenses, totalCount] = await Promise.all([
        ctx.db.expense.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: expenseListInclude,
        }),
        ctx.db.expense.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / limit) || 0;
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        expenses,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalCount,
          totalPages,
          hasNextPage,
          hasPreviousPage,
          returnedCount: expenses.length,
        },
      };
    }),

  // Expense detail page: the expense, its grant/fund pool allocations and,
  // for roles allowed to see client data, the linked client.
  getById: fundPoolReadProcedure
    .input(z.object({ id: z.coerce.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const expense = await ctx.db.expense.findUnique({
        where: { id: input.id },
        include: {
          distributions: {
            include: {
              grantDistribution: {
                include: {
                  grant: { select: { id: true, title: true, endDate: true } },
                  fundPool: { select: { id: true, category: true } },
                },
              },
            },
          },
          client: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      if (!expense) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expense not found",
        });
      }

      const canViewClient =
        ctx.userRole === "InterventionTeam" || ctx.userRole === "Admin";

      return {
        ...expense,
        client: canViewClient ? expense.client : null,
        hasClient: expense.clientId !== null,
        canViewClient,
      };
    }),

  // Link (or unlink with clientId: null) an existing expense to a client.
  setClient: interventionTeamProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        clientId: z.number().int().positive().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const expense = await ctx.db.expense.findUnique({
        where: { id: input.id },
        select: { id: true },
      });
      if (!expense) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expense not found",
        });
      }

      if (input.clientId !== null) {
        const client = await ctx.db.client.findUnique({
          where: { id: input.clientId },
          select: { id: true },
        });
        if (!client) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selected client does not exist",
          });
        }
      }

      return ctx.db.expense.update({
        where: { id: input.id },
        data: { clientId: input.clientId },
        select: { id: true, clientId: true },
      });
    }),

  update: protectedProcedure
    .input(updateExpenseInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, description, date, invoiceUrl, totalAmount, fundPoolId } =
        input;

      // Normalize invoiceUrl: undefined = no change, null/"" = clear, string = set
      let normalizedInvoiceUrl: string | null | undefined;
      if (invoiceUrl === undefined) normalizedInvoiceUrl = undefined;
      else if (invoiceUrl === null || invoiceUrl === "")
        normalizedInvoiceUrl = null;
      else normalizedInvoiceUrl = invoiceUrl;

      const newTotal =
        totalAmount !== undefined
          ? new Prisma.Decimal(String(totalAmount))
          : undefined;

      const needsReallocation =
        newTotal !== undefined || fundPoolId !== undefined;

      // Metadata-only fast path (no amount/pool change)
      if (!needsReallocation) {
        const existing = await ctx.db.expense.findUnique({ where: { id } });
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Expense not found",
          });
        }
        const updated = await ctx.db.expense.update({
          where: { id },
          data: {
            ...(description !== undefined ? { description } : {}),
            ...(date !== undefined ? { date } : {}),
            ...(normalizedInvoiceUrl !== undefined
              ? { invoiceUrl: normalizedInvoiceUrl }
              : {}),
          },
          include: expenseListInclude,
        });
        return { expense: updated };
      }

      return await ctx.db.$transaction(async (tx) => {
        const existing = await tx.expense.findUnique({
          where: { id },
          include: {
            distributions: { include: { grantDistribution: true } },
          },
        });
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Expense not found",
          });
        }

        const oldTotal = new Prisma.Decimal(String(existing.totalAmount));
        const targetTotal = newTotal ?? oldTotal;

        const currentPoolId =
          existing.distributions[0]?.grantDistribution?.fundPoolId ?? null;
        const targetPoolId = fundPoolId ?? currentPoolId;
        if (!targetPoolId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot determine fund pool for expense re-allocation",
          });
        }

        const targetPool = await tx.fundPool.findUnique({
          where: { id: targetPoolId },
        });
        if (!targetPool) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Fund pool not found",
          });
        }

        const metadataChanged =
          description !== undefined ||
          date !== undefined ||
          normalizedInvoiceUrl !== undefined;
        const amountSame = targetTotal.equals(oldTotal);
        const poolSame = targetPoolId === currentPoolId;

        if (amountSame && poolSame) {
          if (!metadataChanged) return { expense: existing };
          const updated = await tx.expense.update({
            where: { id },
            data: {
              ...(description !== undefined ? { description } : {}),
              ...(date !== undefined ? { date } : {}),
              ...(normalizedInvoiceUrl !== undefined
                ? { invoiceUrl: normalizedInvoiceUrl }
                : {}),
            },
            include: expenseListInclude,
          });
          return { expense: updated };
        }

        // Release old allocations so availability checks see freed funds
        for (const d of existing.distributions) {
          await tx.grantDistribution.update({
            where: { id: d.grantDistributionId },
            data: { spentAmount: { decrement: d.amount } },
          });
        }
        await tx.expenseDistribution.deleteMany({ where: { expenseId: id } });

        // Build fresh greedy allocations in the target pool
        const now = new Date();
        const candidates = await tx.grantDistribution.findMany({
          where: {
            fundPoolId: targetPoolId,
            grant: {
              status: "APPROVED",
              OR: [{ endDate: null }, { endDate: { gte: now } }],
            },
          },
          select: {
            id: true,
            amount: true,
            spentAmount: true,
            grant: { select: { endDate: true } },
          },
        });
        // Throws CONFLICT when insufficient funds
        const allocations = buildGreedyAllocations(candidates, targetTotal);

        for (const allocation of allocations) {
          await tx.expenseDistribution.create({
            data: {
              expenseId: id,
              grantDistributionId: allocation.grantDistributionId,
              amount: allocation.amount,
            },
          });
          await tx.grantDistribution.update({
            where: { id: allocation.grantDistributionId },
            data: { spentAmount: { increment: allocation.amount } },
          });
        }

        const updated = await tx.expense.update({
          where: { id },
          data: {
            totalAmount: targetTotal,
            ...(description !== undefined ? { description } : {}),
            ...(date !== undefined ? { date } : {}),
            ...(normalizedInvoiceUrl !== undefined
              ? { invoiceUrl: normalizedInvoiceUrl }
              : {}),
          },
          include: expenseListInclude,
        });
        return { expense: updated };
      });
    }),
});
