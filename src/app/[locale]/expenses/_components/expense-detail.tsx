"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
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

type Allocation = {
  id: number;
  grantId: number;
  grantTitle: string;
  fundPoolId: number | null;
  fundPoolCategory: string;
  amount: number;
};

const allocationColumns: ColumnDef<Allocation>[] = [
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
    accessorKey: "fundPoolCategory",
    header: "FUND POOL",
    cell: ({ row }) =>
      row.original.fundPoolId ? (
        <EntityLink href={`/fund-pools/${row.original.fundPoolId}`}>
          {row.original.fundPoolCategory}
        </EntityLink>
      ) : (
        "Uncategorized"
      ),
  },
  {
    accessorKey: "amount",
    header: "AMOUNT",
    cell: ({ row }) => formatMoney(row.original.amount),
  },
];

export function ExpenseDetail({ id }: { id: number }) {
  const {
    data: expense,
    isLoading,
    isError,
    error,
  } = api.expenses.getById.useQuery({ id }, { retry: false });

  const allocations: Allocation[] = React.useMemo(
    () =>
      (expense?.distributions ?? []).map((d) => ({
        id: d.id,
        grantId: d.grantDistribution.grant.id,
        grantTitle: d.grantDistribution.grant.title,
        fundPoolId: d.grantDistribution.fundPool?.id ?? null,
        fundPoolCategory: d.grantDistribution.fundPool?.category ?? "",
        amount: Number(d.amount),
      })),
    [expense?.distributions],
  );

  if (isLoading) return <TableLoadingState />;
  if (isError || !expense) {
    return <TableErrorState message={error?.message} />;
  }

  const clientValue = expense.client ? (
    <EntityLink href={`/clients/${expense.client.id}`}>
      {expense.client.firstName} {expense.client.lastName}
    </EntityLink>
  ) : expense.hasClient ? (
    <span className="text-muted-foreground">Restricted</span>
  ) : (
    "—"
  );

  return (
    <DetailPage
      backHref="/expenses"
      backLabel="Expenses"
      title={expense.description}
      subtitle={`${formatMoney(expense.totalAmount)} · ${formatDate(expense.date)}`}
    >
      <DetailFields
        fields={[
          { label: "Description", value: expense.description },
          { label: "Date", value: formatDate(expense.date) },
          { label: "Amount", value: formatMoney(expense.totalAmount) },
          {
            label: "Invoice",
            value: expense.invoiceUrl ? (
              <a
                href={expense.invoiceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#3FA9A9] underline-offset-2 hover:underline"
              >
                Open invoice
              </a>
            ) : (
              "—"
            ),
          },
          { label: "Client", value: clientValue },
        ]}
      />

      {expense.canViewClient && (
        <ClientLinkEditor
          // Remount when the saved link changes so the select resets to it.
          key={expense.client?.id ?? "none"}
          expenseId={expense.id}
          currentClientId={expense.client?.id ?? null}
        />
      )}

      <DetailSection title="Grant allocations">
        <DataTable
          columns={allocationColumns}
          data={allocations}
          getRowHref={(row) => `/grants/${row.grantId}`}
          emptyMessage="This expense is not allocated to any grant."
        />
      </DetailSection>
    </DetailPage>
  );
}

function ClientLinkEditor({
  expenseId,
  currentClientId,
}: {
  expenseId: number;
  currentClientId: number | null;
}) {
  const utils = api.useUtils();
  const [selected, setSelected] = React.useState(
    currentClientId ? String(currentClientId) : "",
  );

  const { data: clients } = api.clients.list.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const setClient = api.expenses.setClient.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.expenses.getById.invalidate({ id: expenseId }),
        utils.clients.getById.invalidate(),
      ]);
    },
  });

  const unchanged =
    selected === (currentClientId ? String(currentClientId) : "");

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="expense-client"
          className="text-xs text-muted-foreground"
        >
          Linked client
        </label>
        <select
          id="expense-client"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="h-9 min-w-[240px] rounded-md border border-[#3FA9A9] bg-white px-2"
        >
          <option value="">No client</option>
          {(clients ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.firstName} {c.lastName}
            </option>
          ))}
        </select>
      </div>
      <Button
        variant="outline"
        className="bg-[#45BAB8] text-white hover:bg-[#45BAB8]"
        disabled={unchanged || setClient.isPending}
        onClick={() =>
          setClient.mutate({
            id: expenseId,
            clientId: selected ? Number(selected) : null,
          })
        }
      >
        {setClient.isPending ? "Saving…" : "Save"}
      </Button>
      {setClient.error && (
        <p className="text-sm text-red-600">{setClient.error.message}</p>
      )}
    </div>
  );
}
