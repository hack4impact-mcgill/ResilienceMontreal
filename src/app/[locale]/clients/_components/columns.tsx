"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { RowActionsDropdown } from "@/components/data-table/RowActionsDropdown";
import { formatMoney } from "@/components/detail-page";

export type BackendClient = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  dateOfBirth: Date;
  leaseStart: Date | null;
  leaseEnd: Date | null;
  worker: {
    name: string;
    email: string;
    supabaseId: string;
    role: string;
  } | null;
  expenseCount?: number;
  totalExpenses?: number;
};

export type Client = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: Date | null;
  leaseStartDate: Date | null;
  leaseEndDate: Date | null;
  workerName: string;
  workerId: string;
  /** Number of expenses linked to this client. */
  expenseCount?: number;
  /** Sum of the linked expenses' totals. */
  totalExpenses?: number;
};

const formatDate = (date: Date) =>
  date.toLocaleDateString(undefined, { timeZone: "UTC" });

// Map backend client to frontend Client
export function mapClient(c: BackendClient): Client {
  return {
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email ?? "",
    dateOfBirth: c.dateOfBirth ? new Date(c.dateOfBirth) : null,
    leaseStartDate: c.leaseStart ? new Date(c.leaseStart) : null,
    leaseEndDate: c.leaseEnd ? new Date(c.leaseEnd) : null,
    workerName: c.worker?.name ?? "",
    workerId: c.worker?.supabaseId ?? "",
    expenseCount: c.expenseCount ?? 0,
    totalExpenses: c.totalExpenses ?? 0,
  };
}

function ClientRowActions({
  client,
  onView,
  onEdit,
  onDelete,
}: {
  client: Client;
  onView: (client: Client) => void;
  onEdit: (client: Client) => void;
  onDelete: (clientId: number) => void;
}) {
  const t = useTranslations("common");
  return (
    <RowActionsDropdown
      label={`Actions for ${client.firstName} ${client.lastName}`}
      actions={[
        { label: t("viewDetails"), onClick: () => onView(client) },
        { label: t("edit"), onClick: () => onEdit(client) },
        {
          label: t("delete"),
          destructive: true,
          onClick: () => onDelete(client.id),
        },
      ]}
    />
  );
}

export const createColumns = (
  onView: (client: Client) => void,
  onEdit: (client: Client) => void,
  onDelete: (clientId: number) => void,
): ColumnDef<Client>[] => [
  {
    accessorKey: "firstName",
    header: "FIRST NAME",
    cell: ({ row }) => (
      <button
        type="button"
        onClick={() => onView(row.original)}
        className="text-[#3FA9A9] underline-offset-2 hover:underline"
      >
        {row.original.firstName}
      </button>
    ),
  },
  {
    accessorKey: "lastName",
    header: "LAST NAME",
    cell: ({ row }) => (
      <button
        type="button"
        onClick={() => onView(row.original)}
        className="text-[#3FA9A9] underline-offset-2 hover:underline"
      >
        {row.original.lastName}
      </button>
    ),
  },
  {
    accessorKey: "email",
    header: "EMAIL",
    cell: (info) => info.getValue(),
  },
  {
    accessorKey: "leaseStartDate",
    header: "LEASE START",
    cell: ({ row }) => {
      const date = row.original.leaseStartDate;
      return <div>{date ? formatDate(date) : "—"}</div>;
    },
  },
  {
    accessorKey: "leaseEndDate",
    header: "LEASE END",
    cell: ({ row }) => {
      const date = row.original.leaseEndDate;
      return <div>{date ? formatDate(date) : "—"}</div>;
    },
  },
  {
    accessorKey: "workerName",
    header: "INTERVENTION TEAM WORKER",
    cell: (info) => info.getValue(),
  },
  {
    accessorKey: "totalExpenses",
    header: "TOTAL EXPENSES",
    cell: ({ row }) =>
      row.original.expenseCount ? formatMoney(row.original.totalExpenses) : "—",
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => (
      <ClientRowActions
        client={row.original}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    ),
  },
];
