"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import {
  type DetailField,
  formatDate,
  formatMoney,
} from "@/components/detail-page";
import { parseGrantMeta } from "@/lib/grant-meta";
import { type RouterOutputs } from "~/trpc/react";

export type GrantDetailData = RouterOutputs["grant"]["getById"];
type FundPool = RouterOutputs["fundPool"]["getAll"][number];

/** Editable grant fields as form strings (same set as the table's double-click edit). */
export type GrantDraft = {
  organization: string;
  fundPoolId: string;
  dateReceived: string;
  toBeUsedBy: string;
  email: string;
  phoneNumber: string;
  notes: string;
  amount: string;
};

const toDateInput = (date: unknown) =>
  date ? new Date(date as string).toISOString().slice(0, 10) : "";

export function grantDraftFrom(grant: GrantDetailData): GrantDraft {
  const meta = parseGrantMeta(grant.description);
  const metaString = (key: string) => (meta[key] ? String(meta[key]) : "");
  return {
    organization: grant.title,
    // a grant split over several pools has no single category to edit
    fundPoolId:
      grant.distributions.length === 1
        ? String(grant.distributions[0]!.fundPool?.id ?? "")
        : "",
    dateReceived: toDateInput(meta.dateReceived ?? grant.createdAt),
    toBeUsedBy: toDateInput(meta.toBeUsedBy ?? grant.endDate),
    email: metaString("email"),
    phoneNumber: metaString("phoneNumber"),
    notes: metaString("notes"),
    amount: String(Number(grant.totalAmount)),
  };
}

/**
 * The grant's own fields, shared by the detail page and the details panel.
 * Pass `edit` to get inputs for the editable ones.
 */
export function grantFields(
  grant: GrantDetailData,
  edit?: {
    draft: GrantDraft;
    setDraft: (patch: Partial<GrantDraft>) => void;
    fundPools: FundPool[];
  },
): { fields: DetailField[]; notes: DetailField } {
  const meta = parseGrantMeta(grant.description);
  const metaString = (key: string) =>
    meta[key] ? String(meta[key]) : undefined;
  const metaDate = (key: string) =>
    meta[key] ? formatDate(meta[key] as string) : undefined;

  const allocated = grant.distributions.reduce(
    (sum, d) => sum + Number(d.amount),
    0,
  );
  const spent = grant.distributions.reduce(
    (sum, d) => sum + Number(d.spentAmount),
    0,
  );

  const text = (key: keyof GrantDraft, type = "text") =>
    edit && (
      <Input
        type={type}
        value={edit.draft[key]}
        onChange={(e) => edit.setDraft({ [key]: e.target.value })}
      />
    );

  return {
    fields: [
      {
        label: "Organization",
        value: grant.title,
        input: text("organization"),
      },
      {
        label: "Category",
        value: metaString("category"),
        input: edit && (
          <select
            value={edit.draft.fundPoolId}
            onChange={(e) => edit.setDraft({ fundPoolId: e.target.value })}
            className="h-9 w-full rounded-md border bg-background px-2"
          >
            <option value="" disabled>
              —
            </option>
            {edit.fundPools.map((p) => (
              <option key={p.id} value={p.id}>
                {p.category}
              </option>
            ))}
          </select>
        ),
      },
      { label: "Status", value: grant.status },
      {
        label: "Date received",
        value: metaDate("dateReceived") ?? formatDate(grant.createdAt),
        input: text("dateReceived", "date"),
      },
      {
        label: "To be used by",
        value: metaDate("toBeUsedBy") ?? formatDate(grant.endDate),
        input: text("toBeUsedBy", "date"),
      },
      {
        label: "Email",
        value: metaString("email"),
        input: text("email", "email"),
      },
      {
        label: "Phone",
        value: metaString("phoneNumber"),
        input: text("phoneNumber", "tel"),
      },
      {
        label: "Total amount",
        value: formatMoney(grant.totalAmount),
        input: text("amount", "number"),
      },
      { label: "Unassigned", value: formatMoney(grant.unassignedAmount) },
      { label: "Spent", value: formatMoney(spent) },
      { label: "Remaining", value: formatMoney(allocated - spent) },
    ],
    notes: {
      label: "Notes",
      value: metaString("notes"),
      input: edit && (
        <textarea
          value={edit.draft.notes}
          onChange={(e) => edit.setDraft({ notes: e.target.value })}
          className="min-h-24 w-full rounded-md border bg-background p-2"
        />
      ),
    },
  };
}
