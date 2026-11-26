"use client";

import { useTranslations } from "next-intl";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatMoney } from "@/components/detail-page";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type LinkedExpenseRow = {
  // unique per row (an expense can appear once per category it was paid from)
  key: string | number;
  expenseId: number;
  clientName: string | null;
  // the expense has a client the viewer may not see
  clientRestricted?: boolean;
  // empty when the money came from no fund pool
  categories: string[];
  date: Date | string;
  amount: unknown;
};

// Grey rounded heading bar, as in the mockup.
const HEAD = "bg-muted uppercase";
// Rows are separated by a line under each cell...
const CELL = "truncate border-b py-2";
// ...except the first, whose line starts 12px in so the dividers sit inset
// from the heading bar's rounded edge.
const FIRST_CELL =
  "border-b-0 bg-[linear-gradient(hsl(var(--border)),hsl(var(--border)))] bg-[length:calc(100%-12px)_1px] bg-[position:right_bottom] bg-no-repeat first:pl-6";

/** Opens the expense's details panel on the Expenses page. */
export const expensePanelHref = (expenseId: number) =>
  `/expenses?view=${expenseId}`;

/**
 * Expenses linked to a record (a grant's or a client's), shown under its
 * details. Scrolls past about five rows; each row opens that expense.
 */
export function LinkedExpensesTable({ rows }: { rows: LinkedExpenseRow[] }) {
  const t = useTranslations("common.linkedExpenses");
  const router = useRouter();

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold">{t("title")}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        // Table wraps itself in an overflow-x div; making that visible lets
        // the header stick to this scroll area instead.
        <div className="max-h-60 overflow-y-auto [&>div]:overflow-visible">
          {/* fixed widths so every linked table lines up the same way */}
          <Table className="table-fixed">
            <TableHeader className="sticky top-0 border-t-0 [&_tr]:border-b-0">
              <TableRow className="border-0 hover:bg-transparent">
                <TableHead
                  className={cn(HEAD, "w-[20%] rounded-l-md first:pl-6")}
                >
                  {t("client")}
                </TableHead>
                <TableHead className={cn(HEAD, "w-[20%]")}>
                  {t("category")}
                </TableHead>
                <TableHead className={cn(HEAD, "w-[30%]")}>
                  {t("date")}
                </TableHead>
                <TableHead className={cn(HEAD, "w-[20%] text-right")}>
                  {t("amount")}
                </TableHead>
                {/* keeps the amounts off the right edge, as in the mockup */}
                <TableHead className={cn(HEAD, "w-[10%] rounded-r-md")} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const href = expensePanelHref(row.expenseId);
                return (
                  <TableRow
                    key={row.key}
                    role="link"
                    tabIndex={0}
                    className="cursor-pointer border-0"
                    onClick={() => router.push(href)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") router.push(href);
                    }}
                  >
                    <TableCell className={cn(CELL, FIRST_CELL)}>
                      {row.clientRestricted ? (
                        <span className="text-muted-foreground">
                          {t("restricted")}
                        </span>
                      ) : (
                        (row.clientName ?? "—")
                      )}
                    </TableCell>
                    <TableCell className={CELL}>
                      {row.categories.length > 0
                        ? row.categories.join(", ")
                        : t("uncategorized")}
                    </TableCell>
                    <TableCell className={CELL}>
                      {formatDate(row.date)}
                    </TableCell>
                    <TableCell className={cn(CELL, "text-right")}>
                      {formatMoney(row.amount)}
                    </TableCell>
                    <TableCell className={CELL} />
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
