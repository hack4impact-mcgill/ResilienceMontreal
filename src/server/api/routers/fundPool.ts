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
  // Endpoint to create a new fundpool using given category and amount
  // Example: POST http://localhost:3000/api/trpc/fundPool.createFundPool with body {"json": {"category": "example", "amount": 100}}
  createFundPool: bookkeeperProcedure
    .input(createFundPoolSchema)
    .mutation(async ({ ctx, input }) => {
      const totalAmount = new Prisma.Decimal(String(input.amount));
      const newFundPool = await ctx.db.fundPool.create({
        data: {
          amount: totalAmount,
          category: input.category,
        },
        include: { ...fundPoolInclude },
      });
      return newFundPool;
    }),

  // Endpoint to fetch all fundPools
  // Example: GET http://localhost:3000/api/trpc/fundPool.getFundPools?input={}
  getFundPools: fundPoolReadProcedure.query(async ({ ctx }) => {
    const fundPools = await ctx.db.fundPool.findMany({
      include: { ...fundPoolInclude },
    });
    return fundPools;
  }),

  // Endpoint to fetch a fundPool by ID
  // Example: GET http://localhost:3000/api/trpc/fundPool.getFundPoolById?batch=1&input={"0":{"json": {"id": 1}}}
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

  /* Endpoint to update a fundpool by ID
  POST http://localhost:3000/api/trpc/fundPool.updateFundPoolById?batch=1
  body:
  {
    "0": {
      "json": {
        "id": 1,
        "category": "Operations"
      }
    }
  }
  */
  updateFundPoolById: bookkeeperProcedure
    .input(updateFundPoolSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateFields } = input;
      const updateFundPool = await ctx.db.fundPool.update({
        where: { id },
        data: { ...updateFields },
      });

      return updateFundPool;
    }),

  /* Endpoint to delete a fundpool by ID
  POST http://localhost:3000/api/trpc/fundPool.deleteFundPoolById?batch=1
  body: 
  {
    "0": {
      "json": {
        "id": 1
      }
    }
  }
  */
  deleteFundPoolById: bookkeeperProcedure
    .input(
      z.object({
        id: z.coerce
          .number()
          .int()
          .positive("FundPoolID must be a positive integer"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const deletedFundPool = await ctx.db.fundPool.delete({
        where: { id: input.id },
      });
      return deletedFundPool;
    }),
});
