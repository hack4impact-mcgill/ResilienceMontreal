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
  /** True when the expense date is after today (local calendar day). */
  isFutureDated: boolean;
  /** Fund pool category derived from the first distribution (empty string if none). */
  fundPoolCategory: string;
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
      const future = row.original.isFutureDated;
      return (
        <div className="flex flex-wrap items-center gap-2">
          <span className={future ? "text-muted-foreground" : undefined}>
            {date.toLocaleDateString()}
          </span>
          {future ? (
            <span className="inline-flex rounded border border-amber-600/40 bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
              Future
            </span>
          ) : null}
        </div>
      );
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
