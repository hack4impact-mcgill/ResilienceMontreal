"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/data-table/DataTable";
import { TableErrorState } from "@/components/data-table/TableErrorState";
import { TableLoadingState } from "@/components/data-table/TableLoadingState";
import {
  DetailFields,
  DetailNotes,
  DetailPage,
  DetailSection,
  EntityLink,
  formatDate,
  formatMoney,
  useAuditFields,
} from "@/components/detail-page";
import { api } from "~/trpc/react";
import { grantFields } from "./grant-fields";

type PoolRow = {
  id: number;
  fundPoolId: number | null;
  category: string;
  allocated: number;
  spent: number;
  remaining: number;
};

type ExpenseRow = {
  id: number;
  expenseId: number;
  description: string;
  date: Date;
  fundPoolId: number | null;
  fundPoolCategory: string;
  amount: number;
};

const poolColumns: ColumnDef<PoolRow>[] = [
  {
    accessorKey: "category",
    header: "FUND POOL",
    cell: ({ row }) =>
      row.original.fundPoolId ? (
        <EntityLink href={`/fund-pools/${row.original.fundPoolId}`}>
          {row.original.category}
        </EntityLink>
      ) : (
        "Uncategorized"
      ),
  },
  {
    accessorKey: "allocated",
    header: "ALLOCATED",
    cell: ({ row }) => formatMoney(row.original.allocated),
  },
  {
    accessorKey: "spent",
    header: "SPENT",
    cell: ({ row }) => formatMoney(row.original.spent),
  },
  {
    accessorKey: "remaining",
    header: "REMAINING",
    cell: ({ row }) => formatMoney(row.original.remaining),
  },
];

const expenseColumns: ColumnDef<ExpenseRow>[] = [
  {
    accessorKey: "description",
    header: "EXPENSE",
    cell: ({ row }) => (
      <EntityLink href={`/expenses/${row.original.expenseId}`}>
        {row.original.description}
      </EntityLink>
    ),
  },
  {
    accessorKey: "date",
    header: "DATE",
    cell: ({ row }) => formatDate(row.original.date),
  },
  {
    accessorKey: "fundPoolCategory",
    header: "FUND POOL",
    cell: ({ row }) => row.original.fundPoolCategory || "Uncategorized",
  },
  {
    accessorKey: "amount",
    header: "AMOUNT FROM THIS GRANT",
    cell: ({ row }) => formatMoney(row.original.amount),
  },
];

export function GrantDetail({ id }: { id: number }) {
  const {
    data: grant,
    isLoading,
    isError,
    error,
  } = api.grant.getById.useQuery({ id }, { retry: false });

  const poolRows: PoolRow[] = React.useMemo(
    () =>
      (grant?.distributions ?? []).map((d) => {
        const allocated = Number(d.amount);
        const spent = Number(d.spentAmount);
        return {
          id: d.id,
          fundPoolId: d.fundPool?.id ?? null,
          category: d.fundPool?.category ?? "",
          allocated,
          spent,
          remaining: allocated - spent,
        };
      }),
    [grant?.distributions],
  );

  const expenseRows: ExpenseRow[] = React.useMemo(
    () =>
      (grant?.distributions ?? [])
        .flatMap((d) =>
          d.expenseDistributions.map((ed) => ({
            id: ed.id,
            expenseId: ed.expense.id,
            description: ed.expense.description,
            date: new Date(ed.expense.date),
            fundPoolId: d.fundPool?.id ?? null,
            fundPoolCategory: d.fundPool?.category ?? "",
            amount: Number(ed.amount),
          })),
        )
        .sort((a, b) => b.date.getTime() - a.date.getTime()),
    [grant?.distributions],
  );

  const auditFields = useAuditFields(grant);

  if (isLoading) return <TableLoadingState />;
  if (isError || !grant) {
    return <TableErrorState message={error?.message} />;
  }

  const { fields, notes } = grantFields(grant);

  return (
    <DetailPage
      backHref="/grants"
      backLabel="Grants"
      title={grant.title}
      subtitle={`${formatMoney(grant.totalAmount)} · ${grant.status}`}
    >
      <DetailFields fields={[...fields, ...auditFields]} />
      <DetailNotes label={notes.label} value={notes.value} />

      <DetailSection title="Fund pool distributions">
        <DataTable
          columns={poolColumns}
          data={poolRows}
          getRowHref={(row) =>
            row.fundPoolId ? `/fund-pools/${row.fundPoolId}` : "/fund-pools"
          }
          emptyMessage="This grant is not distributed to any fund pool."
        />
      </DetailSection>

      <DetailSection title="Linked expenses">
        <DataTable
          columns={expenseColumns}
          data={expenseRows}
          getRowHref={(row) => `/expenses/${row.expenseId}`}
          emptyMessage="No expenses have been charged to this grant."
        />
      </DetailSection>
    </DetailPage>
  );
}
