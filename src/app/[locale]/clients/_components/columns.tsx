"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { RowActionsDropdown } from "@/components/data-table/RowActionsDropdown";

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
};

export type Client = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: Date | null;
  leaseStartDate: Date;
  leaseEndDate: Date;
  workerName: string;
  workerId: string;
};

// Map backend client to frontend Client
export function mapClient(c: BackendClient): Client {
  return {
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email ?? "",
    dateOfBirth: c.dateOfBirth ? new Date(c.dateOfBirth) : null,
    leaseStartDate: c.leaseStart ? new Date(c.leaseStart) : new Date(0),
    leaseEndDate: c.leaseEnd ? new Date(c.leaseEnd) : new Date(0),
    workerName: c.worker?.name ?? "",
    workerId: c.worker?.supabaseId ?? "",
  };
}

function ClientRowActions({
  client,
  onEdit,
  onDelete,
}: {
  client: Client;
  onEdit: (client: Client) => void;
  onDelete: (clientId: number) => void;
}) {
  const t = useTranslations("common");
  return (
    <RowActionsDropdown
      label={`Actions for ${client.firstName} ${client.lastName}`}
      actions={[
        { label: t("viewDetails"), href: `/clients/${client.id}` },
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
  onEdit: (client: Client) => void,
  onDelete: (clientId: number) => void,
): ColumnDef<Client>[] => [
  {
    accessorKey: "firstName",
    header: "FIRST NAME",
    cell: (info) => info.getValue(),
  },
  {
    accessorKey: "lastName",
    header: "LAST NAME",
    cell: (info) => info.getValue(),
  },
  {
    accessorKey: "email",
    header: "EMAIL",
    cell: (info) => info.getValue(),
  },
  {
    accessorKey: "dateOfBirth",
    header: "DATE OF BIRTH",
    cell: ({ row }) => {
      const date: Date | null = row.original.dateOfBirth;
      return <div>{date ? date.toLocaleDateString() : "N/A"}</div>;
    },
  },
  {
    accessorKey: "leaseStartDate",
    header: "LEASE START DATE",
    cell: ({ row }) => {
      const date: Date = row.original.leaseStartDate;
      return <div>{date.toLocaleDateString()}</div>;
    },
  },
  {
    accessorKey: "leaseEndDate",
    header: "LEASE END DATE",
    cell: ({ row }) => {
      const date: Date = row.original.leaseEndDate;
      return <div>{date.toLocaleDateString()}</div>;
    },
  },
  {
    accessorKey: "workerName",
    header: "INTERVENTION WORKER",
    cell: (info) => info.getValue(),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => (
      <ClientRowActions
        client={row.original}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    ),
  },
];
