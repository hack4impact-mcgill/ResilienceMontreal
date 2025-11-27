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

export type Client = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  leaseStartDate: Date;
  leaseEndDate: Date;
};

export const columns: ColumnDef<Client>[] = [
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
            <DropdownMenuItem>View client details</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
