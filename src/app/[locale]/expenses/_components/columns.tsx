"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { RowActionsDropdown } from "@/components/data-table/RowActionsDropdown";

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

// No Delete: expenses have no delete endpoint yet
function ExpenseRowActions({ expense }: { expense: Expense }) {
  const t = useTranslations("common");
  return (
    <RowActionsDropdown
      label="Actions for expense"
      actions={[{ label: t("viewDetails"), href: `/expenses/${expense.id}` }]}
    />
  );
}

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
    cell: ({ row }) => <ExpenseRowActions expense={row.original} />,
  },
];
