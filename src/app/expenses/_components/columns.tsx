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
  id: string;
  client: string;
  spendingCategory: string[];
  purchaseDate: Date;
  clientEmail: string;
  phoneNumber: string;
  notes: string;
  amount: number;
};

export const columns: ColumnDef<Expense>[] = [
  {
    accessorKey: "client",
    header: "CLIENT",
    cell: (info) => info.getValue(),
  },
  {
    id: "spendingCategory",
    header: "SPENDING CATEGORY",
    accessorFn: (row) => row.spendingCategory.join(", "),
    cell: (info) => info.getValue(),
  },
  {
    accessorKey: "purchaseDate",
    header: "PURCHASE DATE",
    cell: ({ row }) => {
      const date: Date = row.original.purchaseDate;
      return <div>{date.toLocaleDateString()}</div>;
    },
  },
  {
    accessorKey: "clientEmail",
    header: "CLIENT EMAIL",
    cell: (info) => info.getValue(),
  },
  {
    accessorKey: "phoneNumber",
    header: "PHONE NUMBER",
    cell: (info) => info.getValue(),
  },
  {
    accessorKey: "notes",
    header: "NOTES",
    cell: (info) => {
      const notes = info.getValue() as string;
      return (
        <div className="max-w-xs truncate" title={notes}>
          {notes || "—"}
        </div>
      );
    },
  },
  {
    accessorKey: "amount",
    header: "AMOUNT",
    cell: (info) => {
      const amount = info.getValue() as number;
      return <div>${amount.toFixed(2)}</div>;
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
            <DropdownMenuLabel>Actions for {expense.client}</DropdownMenuLabel>
            <DropdownMenuItem>View expense details</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
