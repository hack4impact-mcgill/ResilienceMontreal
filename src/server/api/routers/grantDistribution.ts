import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { Prisma } from "@prisma/client";
import { createGrantDistributionSchema } from "~/lib/schemas/grantDistribution";
import { TRPCError } from "@trpc/server";

export const grantDistributionRouter = createTRPCRouter({
  // Endpoint to create a new grant distribution given grantId, fundPoolId, and amount
  // Example: POST http://localhost:3000/api/trpc/grantDistribution.createGrantDistribution with body {"json": {"grantId": 1, "fundPoolId": 1, "amount": 100}}

  createGrantDistribution: protectedProcedure
    .input(createGrantDistributionSchema)
    .mutation(async ({ ctx, input }) => {
      const { grantId, fundPoolId, amount } = input;

      const distributionAmount = new Prisma.Decimal(String(amount));
      const result = await ctx.db.$transaction(async (tx) => {
        // Verify grant exists and has sufficient available amount
        const grant = await tx.grant.findUnique({
          where: { id: grantId },
        });
        if (!grant) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Grant not found",
          });
        }

        if (grant.unassignedAmount.lessThan(distributionAmount)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Insufficient available amount in grant",
          });
        }
        // Verify fund pool exists
        const fundPool = await tx.fundPool.findUnique({
          where: { id: fundPoolId },
        });
        if (!fundPool) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Fund pool not found",
          });
        }
        // Create grant distribution
        const grantDistribution = await tx.grantDistribution.create({
          data: {
            grantId,
            fundPoolId,
            amount: distributionAmount,
          },
          include: { grant: true, fundPool: true },
        });

        // Update grant's unassigned amount
        await tx.grant.update({
          where: { id: grantId },
          data: {
            unassignedAmount: new Prisma.Decimal(grant.unassignedAmount).minus(
              distributionAmount
            ),
          },
        });

        // Update fund pool's total amount
        await tx.fundPool.update({
          where: { id: fundPoolId },
          data: {
            amount: new Prisma.Decimal(fundPool.amount).plus(
              distributionAmount
            ),
          },
        });
        return grantDistribution;
      });
      return result;
    }),
});
