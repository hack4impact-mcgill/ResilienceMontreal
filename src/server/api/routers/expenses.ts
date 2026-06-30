import { z } from "zod";
import { Prisma } from "~/generated/prisma/client";

import {
  buildGreedyAllocations,
  expenseListInclude,
  fetchActiveDistributions,
  persistExpenseWithAllocations,
  validateCustomAllocations,
} from "~/server/api/lib/expense-allocation";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
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

export const expensesRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createExpenseInputSchema)
    .mutation(async ({ ctx, input }) => {
      const totalAmount = new Prisma.Decimal(String(input.totalAmount));
      const now = new Date();

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
});
