"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/components/detail-page";
import { api } from "~/trpc/react";

type Row = { key: number; distributionId: string; amount: string };

// Money is compared in whole cents to avoid floating-point drift.
const toCents = (value: number) => Math.round(value * 100);

/** Edits which grant distributions an expense is charged to, and how much. */
export function AllocationEditor({
  expenseId,
  totalAmount,
  current,
  onDone,
}: {
  expenseId: number;
  totalAmount: number;
  current: { grantDistributionId: number; amount: number }[];
  onDone: () => void;
}) {
  const utils = api.useUtils();
  const nextKey = React.useRef(current.length);
  const [rows, setRows] = React.useState<Row[]>(() =>
    current.map((c, i) => ({
      key: i,
      distributionId: String(c.grantDistributionId),
      amount: c.amount.toFixed(2),
    })),
  );

  const {
    data: options,
    isLoading,
    error: optionsError,
  } = api.expenses.allocationOptions.useQuery(
    { id: expenseId },
    { retry: false, refetchOnWindowFocus: false },
  );
  const optionById = React.useMemo(
    () => new Map((options ?? []).map((o) => [String(o.id), o])),
    [options],
  );

  const save = api.expenses.updateAllocations.useMutation({
    onSuccess: async () => {
      // The expense, its grants and their fund pools all show these amounts.
      await Promise.all([
        utils.expenses.getById.invalidate({ id: expenseId }),
        utils.expenses.list.invalidate(),
        utils.expenses.allocationOptions.invalidate({ id: expenseId }),
        utils.grant.getById.invalidate(),
        utils.grant.getAll.invalidate(),
        utils.grant.getGrants.invalidate(),
        utils.fundPool.getFundPoolById.invalidate(),
        utils.fundPool.getAll.invalidate(),
      ]);
      onDone();
    },
  });

  const updateRow = (key: number, patch: Partial<Row>) =>
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );

  const chosen = new Set(rows.map((r) => r.distributionId));
  const allocatedCents = rows.reduce(
    (sum, r) => sum + toCents(Number(r.amount) || 0),
    0,
  );
  const remainingCents = toCents(totalAmount) - allocatedCents;

  const rowError = (row: Row): string | null => {
    const option = optionById.get(row.distributionId);
    if (!option) return "Choose a grant";
    const amount = Number(row.amount);
    if (!(amount > 0)) return "Enter an amount above 0";
    if (!option.active && toCents(amount) > toCents(option.currentAmount)) {
      return `Grant has ended: at most ${formatMoney(option.currentAmount)}`;
    }
    if (toCents(amount) > toCents(option.available)) {
      return `Only ${formatMoney(option.available)} available`;
    }
    return null;
  };

  const hasRowErrors = rows.some((r) => rowError(r) !== null);
  const canSave =
    rows.length > 0 && !hasRowErrors && remainingCents === 0 && !save.isPending;

  if (isLoading) {
    return <p className="text-muted-foreground">Loading grants…</p>;
  }
  if (optionsError) {
    return <p className="text-destructive">{optionsError.message}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => {
        const error = rowError(row);
        return (
          <div key={row.key} className="flex flex-wrap items-start gap-2">
            <div className="flex min-w-[280px] flex-1 flex-col gap-1">
              <select
                aria-label="Grant"
                value={row.distributionId}
                onChange={(e) =>
                  updateRow(row.key, { distributionId: e.target.value })
                }
                className="h-9 w-full rounded-md border border-[#3FA9A9] bg-white px-2"
              >
                <option value="" disabled>
                  Select a grant
                </option>
                {(options ?? []).map((o) => (
                  <option
                    key={o.id}
                    value={o.id}
                    disabled={
                      String(o.id) !== row.distributionId &&
                      chosen.has(String(o.id))
                    }
                  >
                    {o.grant.title} · {o.fundPool?.category ?? "Uncategorized"}{" "}
                    ({formatMoney(o.available)} available
                    {o.active ? "" : ", ended"})
                  </option>
                ))}
              </select>
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
            <Input
              aria-label="Amount"
              type="number"
              min="0"
              step="0.01"
              value={row.amount}
              onChange={(e) => updateRow(row.key, { amount: e.target.value })}
              className="h-9 w-36 border-[#3FA9A9] bg-white"
            />
            <Button
              variant="ghost"
              size="sm"
              aria-label="Remove grant"
              onClick={() =>
                setRows((prev) => prev.filter((r) => r.key !== row.key))
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          className="w-fit gap-1"
          disabled={(options ?? []).length <= rows.length}
          onClick={() =>
            setRows((prev) => [
              ...prev,
              { key: nextKey.current++, distributionId: "", amount: "" },
            ])
          }
        >
          <Plus className="h-4 w-4" /> Add grant
        </Button>
        <p
          className={
            remainingCents === 0 ? "text-muted-foreground" : "text-red-600"
          }
        >
          {formatMoney(allocatedCents / 100)} of {formatMoney(totalAmount)}{" "}
          allocated
          {remainingCents > 0 &&
            ` · ${formatMoney(remainingCents / 100)} left to allocate`}
          {remainingCents < 0 &&
            ` · ${formatMoney(-remainingCents / 100)} over the total`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          className="bg-[#45BAB8] text-white hover:bg-[#45BAB8]"
          disabled={!canSave}
          onClick={() =>
            save.mutate({
              id: expenseId,
              allocations: rows.map((r) => ({
                grantDistributionId: Number(r.distributionId),
                amount: Number(r.amount),
              })),
            })
          }
        >
          {save.isPending ? "Saving…" : "Save allocations"}
        </Button>
        <Button variant="ghost" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        {save.error && (
          <p className="text-sm text-red-600">{save.error.message}</p>
        )}
      </div>
    </div>
  );
}
