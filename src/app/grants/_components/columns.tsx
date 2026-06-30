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

function isGrantExpired(toBeUsedBy: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(toBeUsedBy);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

export type Grant = {
  id: string;
  // dbId is optional and present for grants persisted in the database
  dbId?: number;
  // associated fundPool id for the single distribution (if persisted)
  fundPoolId?: number;
  organization: string;
  category: string;
  dateReceived: Date;
  toBeUsedBy: Date;
  email: string;
  phoneNumber?: string;
  notes?: string;
  originalAmount: number;
  spentAmount: number;
  remainingAmount: number;
};

const formatMoney = (amount: number) =>
  `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const columns: ColumnDef<Grant>[] = [
  {
    accessorKey: "organization",
    header: "ORGANIZATION",
    cell: (info) => info.getValue(),
  },
  {
    accessorKey: "category",
    header: "CATEGORY",
    cell: (info) => info.getValue(),
  },
  {
    accessorKey: "dateReceived",
    header: "DATE RECEIVED",
    cell: ({ row }) => {
      const date: Date = row.original.dateReceived;
      return <div>{date.toLocaleDateString()}</div>;
    },
  },
  {
    accessorKey: "toBeUsedBy",
    header: "TO BE USED BY",
    cell: ({ row }) => {
      const date: Date = row.original.toBeUsedBy;
      const expired = isGrantExpired(date);
      return (
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={
              expired ? "text-muted-foreground line-through" : undefined
            }
          >
            {date.toLocaleDateString()}
          </span>
          {expired ? (
            <span className="inline-flex rounded border border-destructive/40 bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
              Expired
            </span>
          ) : null}
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: "EMAIL",
    cell: (info) => info.getValue(),
  },
  {
    accessorKey: "phoneNumber",
    header: "PHONE NUMBER",
    cell: (info) => info.getValue() ?? "",
  },
  {
    accessorKey: "notes",
    header: "NOTES",
    cell: ({ row }) => {
      const notes: string | undefined = row.original.notes;
      if (!notes) return null;
      const truncated = notes.length > 80 ? notes.slice(0, 80) + "…" : notes;
      return <div title={notes}>{truncated}</div>;
    },
  },
  {
    accessorKey: "originalAmount",
    header: "ORIGINAL",
    cell: ({ row }) => formatMoney(row.original.originalAmount),
  },
  {
    accessorKey: "spentAmount",
    header: "SPENT",
    cell: ({ row }) => formatMoney(row.original.spentAmount),
  },
  {
    accessorKey: "remainingAmount",
    header: "REMAINING",
    cell: ({ row }) => formatMoney(row.original.remainingAmount),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const grant = row.original;

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
              Actions for {grant.organization}
            </DropdownMenuLabel>
            <DropdownMenuItem>View grant details</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
