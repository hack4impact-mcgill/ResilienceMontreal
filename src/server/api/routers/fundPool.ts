import { z } from "zod";
import {
  createTRPCRouter,
  fundPoolReadProcedure,
  bookkeeperProcedure,
} from "~/server/api/trpc";
import { Prisma } from "@prisma/client";
import {
  createFundPoolSchema,
  updateFundPoolSchema,
} from "~/lib/schemas/fundPool";
import { TRPCError } from "@trpc/server";

const fundPoolInclude = {
  distributions: { include: { grant: true } },
  fundAllocations: true,
} as const;

export const fundPoolRouter = createTRPCRouter({
  getAll: fundPoolReadProcedure.query(async ({ ctx }) => {
    const fundPools = await ctx.db.fundPool.findMany({
      include: { ...fundPoolInclude },
      orderBy: { order: "asc" },
    });

    return fundPools.map((pool) => ({
      ...pool,
      calculatedAmount: pool.fundAllocations.reduce(
        (sum, allocation) => sum + allocation.amount.toNumber(),
        0,
      ),
    }));
  }),

  getFundPoolById: fundPoolReadProcedure
    .input(
      z.object({
        id: z.coerce
          .number()
          .int()
          .positive("FundPoolID must be a positive integer"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const fundPool = await ctx.db.fundPool.findUnique({
        where: { id: input.id },
        include: { ...fundPoolInclude },
      });

      if (!fundPool) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "FundPool not found",
        });
      }

      return fundPool;
    }),

  create: bookkeeperProcedure
    .input(createFundPoolSchema)
    .mutation(async ({ ctx, input }) => {
      const maxOrder = await ctx.db.fundPool.aggregate({
        _max: { order: true },
      });
      const nextOrder = (maxOrder._max.order ?? -1) + 1;

      const totalAmount = new Prisma.Decimal(String(input.amount ?? 0));
      const newFundPool = await ctx.db.fundPool.create({
        data: {
          amount: totalAmount,
          category: input.category,
          order: nextOrder,
        },
        include: { ...fundPoolInclude },
      });
      return newFundPool;
    }),

  update: bookkeeperProcedure
    .input(updateFundPoolSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateFields } = input;
      const updateFundPool = await ctx.db.fundPool.update({
        where: { id },
        data: { ...updateFields },
      });

      return updateFundPool;
    }),

  delete: bookkeeperProcedure
    .input(
      z.object({
        id: z.coerce
          .number()
          .int()
          .positive("FundPoolID must be a positive integer"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.$transaction([
        ctx.db.grantDistribution.updateMany({
          where: { fundPoolId: input.id },
          data: { fundPoolId: null },
        }),
        ctx.db.fundPool.delete({
          where: { id: input.id },
        }),
      ]);

      return { success: true };
    }),

  reorder: bookkeeperProcedure
    .input(
      z.object({
        orderedIds: z.array(z.number().int().positive()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.$transaction(
        input.orderedIds.map((id, index) =>
          ctx.db.fundPool.update({
            where: { id },
            data: { order: index },
          }),
        ),
      );

      return { success: true };
    }),

  getTotalFunding: fundPoolReadProcedure.query(async ({ ctx }) => {
    const fundPools = await ctx.db.fundPool.findMany({
      include: { fundAllocations: true },
    });

    const categorizedTotal = fundPools.reduce((sum, pool) => {
      const poolAmount = pool.fundAllocations.reduce(
        (poolSum, allocation) => poolSum + allocation.amount.toNumber(),
        0,
      );
      return sum + poolAmount;
    }, 0);

    const uncategorizedDistributions = await ctx.db.grantDistribution.findMany({
      where: { fundPoolId: null },
    });

    const uncategorizedTotal = uncategorizedDistributions.reduce(
      (sum, dist) => sum + dist.amount.toNumber(),
      0,
    );

    return { total: categorizedTotal + uncategorizedTotal };
  }),

  getUncategorized: fundPoolReadProcedure.query(async ({ ctx }) => {
    const distributions = await ctx.db.grantDistribution.findMany({
      where: { fundPoolId: null },
      include: { grant: true },
    });

    const totalAmount = distributions.reduce(
      (sum, dist) => sum + dist.amount.toNumber(),
      0,
    );

    return {
      count: distributions.length,
      totalAmount,
      distributions,
    };
  }),
});
