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
import { api } from "~/trpc/react";

type GrantRow = {
  id: number;
  grantId: number;
  title: string;
  endDate: Date | null;
  allocated: number;
  spent: number;
  remaining: number;
};

type ExpenseRow = {
  id: number;
  expenseId: number;
  description: string;
  date: Date;
  grantId: number;
  grantTitle: string;
  amount: number;
};

const grantColumns: ColumnDef<GrantRow>[] = [
  {
    accessorKey: "title",
    header: "GRANT",
    cell: ({ row }) => (
      <EntityLink href={`/grants/${row.original.grantId}`}>
        {row.original.title}
      </EntityLink>
    ),
  },
  {
    accessorKey: "endDate",
    header: "END DATE",
    cell: ({ row }) => formatDate(row.original.endDate),
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
    accessorKey: "grantTitle",
    header: "GRANT",
    cell: ({ row }) => (
      <EntityLink href={`/grants/${row.original.grantId}`}>
        {row.original.grantTitle}
      </EntityLink>
    ),
  },
  {
    accessorKey: "amount",
    header: "AMOUNT FROM THIS POOL",
    cell: ({ row }) => formatMoney(row.original.amount),
  },
];

export function FundPoolDetail({ id }: { id: number }) {
  const {
    data: fundPool,
    isLoading,
    isError,
    error,
  } = api.fundPool.getFundPoolById.useQuery({ id }, { retry: false });

  const grantRows: GrantRow[] = React.useMemo(
    () =>
      (fundPool?.distributions ?? []).map((d) => {
        const allocated = Number(d.amount);
        const spent = Number(d.spentAmount);
        return {
          id: d.id,
          grantId: d.grant.id,
          title: d.grant.title,
          endDate: d.grant.endDate ? new Date(d.grant.endDate) : null,
          allocated,
          spent,
          remaining: allocated - spent,
        };
      }),
    [fundPool?.distributions],
  );

  const expenseRows: ExpenseRow[] = React.useMemo(
    () =>
      (fundPool?.distributions ?? [])
        .flatMap((d) =>
          d.expenseDistributions.map((ed) => ({
            id: ed.id,
            expenseId: ed.expense.id,
            description: ed.expense.description,
            date: new Date(ed.expense.date),
            grantId: d.grant.id,
            grantTitle: d.grant.title,
            amount: Number(ed.amount),
          })),
        )
        .sort((a, b) => b.date.getTime() - a.date.getTime()),
    [fundPool?.distributions],
  );

  if (isLoading) return <TableLoadingState />;
  if (isError || !fundPool) {
    return <TableErrorState message={error?.message} />;
  }

  const allocated = grantRows.reduce((sum, r) => sum + r.allocated, 0);
  const spent = grantRows.reduce((sum, r) => sum + r.spent, 0);

  return (
    <DetailPage
      backHref="/fund-pools"
      backLabel="Fund Pools"
      title={fundPool.category}
      subtitle={`${formatMoney(allocated - spent)} remaining`}
    >
      <DetailFields
        fields={[
          { label: "Category", value: fundPool.category },
          { label: "Allocated", value: formatMoney(allocated) },
          { label: "Spent", value: formatMoney(spent) },
          { label: "Remaining", value: formatMoney(allocated - spent) },
          { label: "Grants", value: grantRows.length },
          { label: "Expenses", value: expenseRows.length },
        ]}
      />

      <DetailSection title="Grants funding this pool">
        <DataTable
          columns={grantColumns}
          data={grantRows}
          getRowHref={(row) => `/grants/${row.grantId}`}
          emptyMessage="No grants are distributed to this fund pool."
        />
      </DetailSection>

      <DetailSection title="Linked expenses">
        <DataTable
          columns={expenseColumns}
          data={expenseRows}
          getRowHref={(row) => `/expenses/${row.expenseId}`}
          emptyMessage="No expenses have been charged to this fund pool."
        />
      </DetailSection>
    </DetailPage>
  );
}
