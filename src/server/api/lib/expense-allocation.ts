import { TRPCError } from "@trpc/server";
import { Prisma } from "~/generated/prisma/client";
import type { PrismaClient } from "~/generated/prisma/client";

export type Allocation = {
  grantDistributionId: number;
  amount: Prisma.Decimal;
};

export type GrantDistributionCandidate = {
  id: number;
  amount: Prisma.Decimal;
  spentAmount: Prisma.Decimal;
  grant: {
    endDate: Date | null;
  };
};

export type ExpenseCreateData = {
  totalAmount: Prisma.Decimal;
  description: string;
  date: Date;
  invoiceUrl?: string;
};

export type CustomDistributionInput = {
  grantDistributionId: number;
  amount: number;
};

type DbClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

type TransactionClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

const activeGrantDistributionWhere = (fundPoolId: number, now: Date) =>
  ({
    fundPoolId,
    grant: {
      status: "APPROVED" as const,
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
  }) satisfies Prisma.GrantDistributionWhereInput;

const candidateSelect = {
  id: true,
  amount: true,
  spentAmount: true,
  grant: {
    select: {
      endDate: true,
    },
  },
} satisfies Prisma.GrantDistributionSelect;

export function sortDistributionsByEndDateAsc<
  T extends { id: number; grant: { endDate: Date | null } },
>(candidates: T[]): T[] {
  return [...candidates].sort((a, b) => {
    const aTs = a.grant.endDate?.getTime() ?? Number.MIN_SAFE_INTEGER;
    const bTs = b.grant.endDate?.getTime() ?? Number.MIN_SAFE_INTEGER;
    if (aTs !== bTs) return aTs - bTs;
    return a.id - b.id;
  });
}

export function availableAmount(distribution: {
  amount: Prisma.Decimal | unknown;
  spentAmount: Prisma.Decimal | unknown;
}): Prisma.Decimal {
  return new Prisma.Decimal(String(distribution.amount)).minus(
    new Prisma.Decimal(String(distribution.spentAmount)),
  );
}

export async function fetchActiveDistributions(
  db: DbClient,
  fundPoolId: number,
  now: Date,
) {
  return db.grantDistribution.findMany({
    where: activeGrantDistributionWhere(fundPoolId, now),
    select: candidateSelect,
  });
}

export function buildGreedyAllocations(
  candidates: GrantDistributionCandidate[],
  totalAmount: Prisma.Decimal,
): Allocation[] {
  const sortedCandidates = sortDistributionsByEndDateAsc(candidates);
  const allocations: Allocation[] = [];
  let remaining = totalAmount;
  let totalAvailable = new Prisma.Decimal(0);

  for (const distribution of sortedCandidates) {
    const available = availableAmount(distribution);
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

  return allocations;
}

export async function validateCustomAllocations(
  db: DbClient,
  input: {
    fundPoolId: number;
    totalAmount: Prisma.Decimal;
    customDistributions: CustomDistributionInput[];
    now: Date;
  },
): Promise<Allocation[]> {
  const customSum = input.customDistributions.reduce(
    (sum, row) => sum.plus(new Prisma.Decimal(String(row.amount))),
    new Prisma.Decimal(0),
  );

  if (!customSum.equals(input.totalAmount)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Custom allocation amounts must sum to expense total",
    });
  }

  const ids = input.customDistributions.map((row) => row.grantDistributionId);
  const distributions = await db.grantDistribution.findMany({
    where: {
      id: { in: ids },
      ...activeGrantDistributionWhere(input.fundPoolId, input.now),
    },
    select: candidateSelect,
  });

  if (distributions.length !== ids.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "One or more grant distributions are invalid or belong to another fund pool",
    });
  }

  const byId = new Map(distributions.map((row) => [row.id, row]));

  return input.customDistributions.map((row) => {
    const distribution = byId.get(row.grantDistributionId);
    if (!distribution) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "One or more grant distributions are invalid or belong to another fund pool",
      });
    }

    const customAmount = new Prisma.Decimal(String(row.amount));
    const available = availableAmount(distribution);

    if (available.lessThan(customAmount)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `Insufficient available funds for grant distribution ${row.grantDistributionId}`,
      });
    }

    return {
      grantDistributionId: row.grantDistributionId,
      amount: customAmount,
    };
  });
}

export async function persistExpenseWithAllocations(
  tx: TransactionClient,
  input: ExpenseCreateData,
  allocations: Allocation[],
) {
  const createdExpense = await tx.expense.create({
    data: {
      totalAmount: input.totalAmount,
      description: input.description,
      date: input.date,
      invoiceUrl: input.invoiceUrl,
    },
  });

  if (allocations.length > 0) {
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
              fundPool: {
                select: {
                  id: true,
                  category: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

export const expenseListInclude = {
  distributions: {
    include: {
      grantDistribution: {
        include: {
          grant: { select: { id: true, title: true } },
          fundPool: { select: { id: true, category: true } },
        },
      },
    },
  },
} satisfies Prisma.ExpenseInclude;
