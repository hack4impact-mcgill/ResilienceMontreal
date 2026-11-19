"use client";
import { InvoiceDisplay } from "~/components/expenses/invoice-display";

import { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { RowActionsDropdown } from "@/components/data-table/RowActionsDropdown";
import { EntityLink } from "@/components/detail-page";

export type Expense = {
  id: number;
  description: string;
  date: Date;
  totalAmount: number;
  invoiceUrl: string | null;
  invoiceDriveFileId: string | null;
  invoiceDriveFileName: string | null;
  /** True when the expense date is after today (local calendar day). */
  isFutureDated: boolean;
  /** Fund pool category derived from the first distribution (empty string if none). */
  fundPoolCategory: string;
  /** Linked client; null when none is linked or the viewer can't see clients. */
  client: { id: number; name: string } | null;
};

// Delete lives in the details panel (Bookkeeper / Admin only)
function ExpenseRowActions({
  expense,
  onView,
}: {
  expense: Expense;
  onView: (expenseId: number) => void;
}) {
  const t = useTranslations("common");
  return (
    <RowActionsDropdown
      label="Actions for expense"
      actions={[
        { label: t("viewDetails"), onClick: () => onView(expense.id) },
        ...(expense.invoiceDriveFileId
          ? [
              {
                label: "Download invoice",
                href: `/api/expenses/${expense.id}/invoice?download=1`,
                download: true,
              },
            ]
          : []),
      ]}
    />
  );
}

export const createColumns = (
  onView: (expenseId: number) => void,
): ColumnDef<Expense>[] => [
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
    cell: ({ row }) => (
      <InvoiceDisplay
        expense={row.original}
        urlLabel="Link"
        showDownload={false}
      />
    ),
  },
  {
    // Hidden for roles that can't see client data (see ExpensesTable)
    id: "client",
    header: "CLIENT",
    cell: ({ row }) =>
      row.original.client ? (
        <EntityLink href={`/clients/${row.original.client.id}`}>
          {row.original.client.name}
        </EntityLink>
      ) : (
        "—"
      ),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => (
      <ExpenseRowActions expense={row.original} onView={onView} />
    ),
  },
];
