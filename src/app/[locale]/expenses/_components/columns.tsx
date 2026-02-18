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

export type Expense = {
  id: number;
  description: string;
  date: Date;
  totalAmount: number;
  invoiceUrl: string | null;
};

export const columns: ColumnDef<Expense>[] = [
  {
    accessorKey: "description",
    header: "DESCRIPTION",
    cell: (info) => info.getValue(),
  },
  {
    accessorKey: "date",
    header: "DATE",
    cell: ({ row }) => {
      const date: Date = row.original.date;
      return <div>{date.toLocaleDateString()}</div>;
    },
  },
  {
    accessorKey: "totalAmount",
    header: "AMOUNT",
    cell: (info) => {
      const amount = info.getValue() as number;
      return <div>${Number(amount).toFixed(2)}</div>;
    },
  },
  {
    accessorKey: "invoiceUrl",
    header: "INVOICE",
    cell: ({ row }) => {
      const url = row.original.invoiceUrl;
      if (!url) return <div>—</div>;
      return (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-xs underline text-blue-600"
        >
          Link
        </a>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const expense = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions for expense</DropdownMenuLabel>
            <DropdownMenuItem>View expense details</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
