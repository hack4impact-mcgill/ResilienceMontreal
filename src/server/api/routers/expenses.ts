import { z } from "zod";
import { Prisma } from "~/generated/prisma/client";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { expenseListQuerySchema } from "~/lib/schemas/expense";

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
