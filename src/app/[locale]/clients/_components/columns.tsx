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
            <DropdownMenuItem onClick={() => alert("View details coming soon")}>
              View details
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
