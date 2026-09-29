"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/data-table/DataTable";
import { TableErrorState } from "@/components/data-table/TableErrorState";
import { TableLoadingState } from "@/components/data-table/TableLoadingState";
import {
  DetailFields,
  DetailPage,
  DetailSection,
  EntityLink,
  formatDate,
  formatMoney,
} from "@/components/detail-page";
import { parseGrantMeta } from "@/lib/grant-meta";
import { api } from "~/trpc/react";

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

  if (isLoading) return <TableLoadingState />;
  if (isError || !grant) {
    return <TableErrorState message={error?.message} />;
  }

  const meta = parseGrantMeta(grant.description);
  const allocated = poolRows.reduce((sum, r) => sum + r.allocated, 0);
  const spent = poolRows.reduce((sum, r) => sum + r.spent, 0);
  const metaString = (key: string) =>
    meta[key] ? String(meta[key]) : undefined;
  const metaDate = (key: string) =>
    meta[key] ? formatDate(meta[key] as string) : undefined;

  return (
    <DetailPage
      backHref="/grants"
      backLabel="Grants"
      title={grant.title}
      subtitle={`${formatMoney(grant.totalAmount)} · ${grant.status}`}
    >
      <DetailFields
        fields={[
          { label: "Organization", value: grant.title },
          { label: "Category", value: metaString("category") },
          { label: "Status", value: grant.status },
          {
            label: "Date received",
            value: metaDate("dateReceived") ?? formatDate(grant.createdAt),
          },
          {
            label: "To be used by",
            value: metaDate("toBeUsedBy") ?? formatDate(grant.endDate),
          },
          { label: "Email", value: metaString("email") },
          { label: "Phone", value: metaString("phoneNumber") },
          { label: "Total amount", value: formatMoney(grant.totalAmount) },
          { label: "Unassigned", value: formatMoney(grant.unassignedAmount) },
          { label: "Spent", value: formatMoney(spent) },
          { label: "Remaining", value: formatMoney(allocated - spent) },
          { label: "Notes", value: metaString("notes") },
        ]}
      />

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
