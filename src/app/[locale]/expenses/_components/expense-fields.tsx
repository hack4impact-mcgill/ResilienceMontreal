"use client";
import { InvoiceDisplay } from "~/components/expenses/invoice-display";
import { InvoiceInput } from "~/components/expenses/invoice-input";

import * as React from "react";

import { Input } from "@/components/ui/input";
import {
  type DetailField,
  EntityLink,
  formatDate,
  formatMoney,
} from "@/components/detail-page";
import { type RouterOutputs } from "~/trpc/react";

export type ExpenseDetailData = RouterOutputs["expenses"]["getById"];

/** Fields expenses.update can change; the amount goes through Edit allocations. */
export type ExpenseDraft = {
  description: string;
  date: string;
  invoiceUrl: string;
  invoiceDriveFileId: string | null;
  invoiceDriveFileName: string | null;
};

export function expenseDraftFrom(expense: ExpenseDetailData): ExpenseDraft {
  return {
    description: expense.description,
    date: new Date(expense.date).toISOString().slice(0, 10),
    invoiceUrl: expense.invoiceUrl ?? "",
    invoiceDriveFileId: expense.invoiceDriveFileId,
    invoiceDriveFileName: expense.invoiceDriveFileName,
  };
}

/**
 * The expense's own fields, shared by the detail page and the details panel.
 * The description is returned as `notes` since it can be long.
 */
export function expenseFields(
  expense: ExpenseDetailData,
  edit?: {
    draft: ExpenseDraft;
    setDraft: (patch: Partial<ExpenseDraft>) => void;
  },
): { fields: DetailField[]; notes: DetailField } {
  const clientValue = expense.client ? (
    <EntityLink href={`/clients/${expense.client.id}`}>
      {expense.client.firstName} {expense.client.lastName}
    </EntityLink>
  ) : expense.hasClient ? (
    <span className="text-muted-foreground">Restricted</span>
  ) : (
    "—"
  );

  return {
    fields: [
      {
        label: "Date",
        value: formatDate(expense.date),
        input: edit && (
          <Input
            type="date"
            value={edit.draft.date}
            onChange={(e) => edit.setDraft({ date: e.target.value })}
          />
        ),
      },
      { label: "Amount", value: formatMoney(expense.totalAmount) },
      {
        label: "Invoice",
        value: <InvoiceDisplay expense={expense} />,
        input: edit && (
          <InvoiceInput
            value={edit.draft}
            onChange={(value) => edit.setDraft(value)}
          />
        ),
      },
      { label: "Client", value: clientValue },
    ],
    notes: {
      label: "Description",
      value: expense.description,
      input: edit && (
        <textarea
          value={edit.draft.description}
          onChange={(e) => edit.setDraft({ description: e.target.value })}
          className="min-h-24 w-full rounded-md border bg-background p-2"
        />
      ),
    },
  };
}
