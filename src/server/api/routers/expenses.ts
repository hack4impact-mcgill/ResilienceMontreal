import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const expensesRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        totalAmount: z.coerce.number(),
        description: z.string().min(1),
        date: z.coerce.date(),
        invoiceUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const expense = await ctx.db.expense.create({
        data: {
          totalAmount: input.totalAmount,
          description: input.description,
          date: input.date,
          invoiceUrl: input.invoiceUrl ?? undefined,
        },
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
