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
      const ids = data.customDistributions.map((row) => row.grantDistributionId);
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
          include: expenseListInclude,
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
