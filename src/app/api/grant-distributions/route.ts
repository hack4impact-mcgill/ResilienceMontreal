import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { grantId, fundPoolId, amount } = await request.json();

    if (!grantId || !fundPoolId || !amount) {
      return new Response("Missing required fields", { status: 400 });
    }

    const distributionAmount = new Prisma.Decimal(String(amount));
    if (distributionAmount.lessThanOrEqualTo(0)) {
      return new Response("Invalid distribution amount", { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Verify grant exists and has sufficient available amount
      const grant = await tx.grant.findUnique({
        where: { id: grantId },
      });

      if (!grant) {
        throw new Error("Grant not found");
      }

      if (grant.unassignedAmount.lessThan(distributionAmount)) {
        throw new Error("Insufficient available amount in grant");
      }

      // Verify fund pool exists
      const fundPool = await tx.fundPool.findUnique({
        where: { id: fundPoolId },
      });
      if (!fundPool) {
        throw new Error("Fund pool not found");
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
          amount: new Prisma.Decimal(fundPool.amount).plus(distributionAmount),
        },
      });
      return grantDistribution;
    });

    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    console.error("Create GrantDistribution error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
