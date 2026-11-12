"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";

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
  leaseStartDate: Date | null;
  leaseEndDate: Date | null;
  workerName: string;
  workerId: string;
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
  };
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
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const client = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              Actions for {client.firstName} {client.lastName}
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit(client)}>
              Edit client
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(client.id)}>
              Delete client
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onView(client)}>
              View details
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
