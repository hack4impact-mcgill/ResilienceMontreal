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

type ExpenseRow = {
  id: number;
  description: string;
  date: Date;
  grants: { id: number; title: string }[];
  amount: number;
};

const expenseColumns: ColumnDef<ExpenseRow>[] = [
  {
    accessorKey: "description",
    header: "EXPENSE",
    cell: ({ row }) => (
      <EntityLink href={`/expenses/${row.original.id}`}>
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
    id: "grants",
    header: "GRANTS",
    cell: ({ row }) =>
      row.original.grants.length === 0 ? (
        "—"
      ) : (
        <div className="flex flex-wrap gap-x-2">
          {row.original.grants.map((g) => (
            <EntityLink key={g.id} href={`/grants/${g.id}`}>
              {g.title}
            </EntityLink>
          ))}
        </div>
      ),
  },
  {
    accessorKey: "amount",
    header: "AMOUNT",
    cell: ({ row }) => formatMoney(row.original.amount),
  },
];

export function ClientDetail({ id }: { id: number }) {
  const {
    data: client,
    isLoading,
    isError,
    error,
  } = api.clients.getById.useQuery({ id }, { retry: false });

  const expenseRows: ExpenseRow[] = React.useMemo(
    () =>
      (client?.expenses ?? []).map((e) => {
        const grants = new Map<number, string>();
        for (const d of e.distributions) {
          grants.set(
            d.grantDistribution.grant.id,
            d.grantDistribution.grant.title,
          );
        }
        return {
          id: e.id,
          description: e.description,
          date: new Date(e.date),
          grants: [...grants].map(([grantId, title]) => ({
            id: grantId,
            title,
          })),
          amount: Number(e.totalAmount),
        };
      }),
    [client?.expenses],
  );

  if (isLoading) return <TableLoadingState />;
  if (isError || !client) {
    return <TableErrorState message={error?.message} />;
  }

  const totalSpent = expenseRows.reduce((sum, r) => sum + r.amount, 0);

  return (
    <DetailPage
      backHref="/clients"
      backLabel="Clients"
      title={`${client.firstName} ${client.lastName}`}
      subtitle={client.worker ? `Worker: ${client.worker.name}` : undefined}
    >
      <DetailFields
        fields={[
          { label: "First name", value: client.firstName },
          { label: "Last name", value: client.lastName },
          { label: "Date of birth", value: formatDate(client.dateOfBirth) },
          { label: "Email", value: client.email },
          { label: "Phone", value: client.phone },
          { label: "Landlord", value: client.landlordName },
          { label: "Lease start", value: formatDate(client.leaseStart) },
          { label: "Lease end", value: formatDate(client.leaseEnd) },
          { label: "Intervention worker", value: client.worker?.name },
          { label: "Total expenses", value: formatMoney(totalSpent) },
        ]}
      />

      <DetailSection title="Linked expenses">
        <DataTable
          columns={expenseColumns}
          data={expenseRows}
          getRowHref={(row) => `/expenses/${row.id}`}
          emptyMessage="No expenses are linked to this client."
        />
      </DetailSection>
    </DetailPage>
  );
}
