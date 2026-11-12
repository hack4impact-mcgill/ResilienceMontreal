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
  clientId?: number;
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
      clientId: input.clientId,
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

const isDistributionActive = (
  grant: { status: string; endDate: Date | null },
  now: Date,
) => grant.status === "APPROVED" && (!grant.endDate || grant.endDate >= now);

// Replaces an existing expense's allocations. The old amounts are released
// back to their grant distributions before the new ones are checked, so an
// expense can move money between grants it already uses.
//
// Design decisions (RM-138 follow-up, open to change):
// - Any fund pool: unlike creation, re-allocation is not limited to the
//   expense's original fund pool, so a bookkeeper can fix an expense that was
//   filed under the wrong pool.
// - Expired grants: new money must go to active, approved grants. An amount
//   already on a grant that has since expired or lost approval may be kept or
//   reduced, but not increased, so editing an older expense doesn't force its
//   money off a grant it was legitimately spent from.
export async function reallocateExpense(
  tx: TransactionClient,
  input: {
    expenseId: number;
    allocations: CustomDistributionInput[];
    now: Date;
  },
) {
  const expense = await tx.expense.findUnique({
    where: { id: input.expenseId },
    select: {
      id: true,
      totalAmount: true,
      distributions: { select: { grantDistributionId: true, amount: true } },
    },
  });

  if (!expense) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Expense not found" });
  }

  const newSum = input.allocations.reduce(
    (sum, row) => sum.plus(new Prisma.Decimal(String(row.amount))),
    new Prisma.Decimal(0),
  );
  if (!newSum.equals(expense.totalAmount)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Allocation amounts must sum to expense total",
    });
  }

  const previous = new Map(
    expense.distributions.map((d) => [d.grantDistributionId, d.amount]),
  );

  for (const old of expense.distributions) {
    await tx.grantDistribution.update({
      where: { id: old.grantDistributionId },
      data: { spentAmount: { decrement: old.amount } },
    });
  }
  await tx.expenseDistribution.deleteMany({
    where: { expenseId: expense.id },
  });

  const distributions = await tx.grantDistribution.findMany({
    where: {
      id: { in: input.allocations.map((row) => row.grantDistributionId) },
    },
    select: {
      id: true,
      amount: true,
      spentAmount: true,
      grant: { select: { status: true, endDate: true } },
    },
  });
  const byId = new Map(distributions.map((d) => [d.id, d]));

  const allocations: Allocation[] = input.allocations.map((row) => {
    const distribution = byId.get(row.grantDistributionId);
    if (!distribution) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Grant distribution ${row.grantDistributionId} does not exist`,
      });
    }

    const amount = new Prisma.Decimal(String(row.amount));
    const kept = previous.get(row.grantDistributionId);
    if (
      !isDistributionActive(distribution.grant, input.now) &&
      (!kept || amount.gt(kept))
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Grant distribution ${row.grantDistributionId} belongs to an expired or unapproved grant`,
      });
    }

    if (availableAmount(distribution).lessThan(amount)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `Insufficient available funds for grant distribution ${row.grantDistributionId}`,
      });
    }

    return { grantDistributionId: row.grantDistributionId, amount };
  });

  await tx.expenseDistribution.createMany({
    data: allocations.map((allocation) => ({
      expenseId: expense.id,
      grantDistributionId: allocation.grantDistributionId,
      amount: allocation.amount,
    })),
  });
  for (const allocation of allocations) {
    await tx.grantDistribution.update({
      where: { id: allocation.grantDistributionId },
      data: { spentAmount: { increment: allocation.amount } },
    });
  }

  return { id: expense.id };
}
