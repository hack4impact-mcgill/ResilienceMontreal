"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/components/detail-page";
import {
  formatPercent,
  type SplitLine,
  splitCents,
  splitError,
} from "@/lib/grant-split";
import { type RouterOutputs } from "~/trpc/react";

type FundPool = RouterOutputs["fundPool"]["getAll"][number];
export type SplitRow = SplitLine & { key: number };

/** Row under the add-grant form for dividing the grant over fund pools by percentage. */
export function GrantSplitEditor({
  colCount,
  className,
  lines,
  onChange,
  onAddLine,
  fundPools,
  totalAmount,
}: {
  colCount: number;
  className?: string;
  lines: SplitRow[];
  onChange: (lines: SplitRow[]) => void;
  onAddLine: () => void;
  fundPools: FundPool[];
  totalAmount: number;
}) {
  const error = splitError(totalAmount, lines);
  // amounts only make sense once the percentages are usable
  const cents =
    totalAmount > 0 && lines.length > 0 ? splitCents(totalAmount, lines) : [];
  const chosen = new Set(lines.map((line) => line.fundPoolId));
  const updateLine = (key: number, patch: Partial<SplitLine>) =>
    onChange(
      lines.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );

  return (
    <TableRow className={className}>
      <TableCell colSpan={colCount} className="px-20 py-3">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Split between categories</p>
          {lines.map((line, i) => (
            <div key={line.key} className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Split category"
                value={line.fundPoolId}
                onChange={(e) =>
                  updateLine(line.key, { fundPoolId: e.target.value })
                }
                className="h-7 w-48 rounded-md bg-white px-2"
              >
                <option value="" disabled>
                  Select a category
                </option>
                {fundPools.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    disabled={
                      String(p.id) !== line.fundPoolId &&
                      chosen.has(String(p.id))
                    }
                  >
                    {p.category}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                <Input
                  aria-label="Split percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={line.percent}
                  onChange={(e) =>
                    updateLine(line.key, { percent: e.target.value })
                  }
                  className="h-7 w-24 bg-white px-2"
                />
                <span className="text-sm">%</span>
              </div>
              <span className="w-28 text-sm text-muted-foreground">
                {!error && cents[i] !== undefined
                  ? formatMoney(cents[i] / 100)
                  : ""}
              </span>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Remove category"
                onClick={() =>
                  onChange(lines.filter((other) => other.key !== line.key))
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-fit gap-1"
              disabled={lines.length >= fundPools.length}
              onClick={onAddLine}
            >
              <Plus className="h-4 w-4" /> Add category
            </Button>
            <p
              className={
                error ? "text-sm text-red-600" : "text-sm text-muted-foreground"
              }
            >
              {error ??
                `${lines.map((line) => formatPercent(Number(line.percent))).join(" + ")} = 100%`}
            </p>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
