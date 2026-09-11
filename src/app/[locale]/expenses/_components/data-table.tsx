"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { CirclePlus, Search } from "lucide-react";
import { z } from "zod";
import { TRPCClientError } from "@trpc/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { columns, Expense } from "./columns";
import { api } from "~/trpc/react";
import { cn } from "@/lib/utils";

import { useServerTableState } from "@/hooks/use-server-table-state";
import { useAdvancedFilters } from "@/hooks/use-advanced-filters";
import { useTableForm } from "@/hooks/use-table-form";
import { exportToCSV } from "@/lib/data-table/export-csv";
import { FetchingOverlay } from "@/components/data-table/FetchingOverlay";
import { TableEmptyRow } from "@/components/data-table/TableEmptyRow";
import { TablePagination } from "@/components/data-table/TablePagination";
import { TableSortControls } from "@/components/data-table/TableSortControls";
import { AdvancedFilterPopover } from "@/components/data-table/AdvancedFilterPopover";
import { InlineFormRow } from "@/components/data-table/InlineFormRow";

type ExpenseSortBy = "date" | "totalAmount" | "description" | "id";

type TRPCErrorDataShape = {
  zodError?: { fieldErrors?: Record<string, string[]> };
};

const getFriendlyError = (err: unknown): string => {
  if (err instanceof TRPCClientError) {
    const data = err.data as TRPCErrorDataShape | undefined;
    const fieldErrors = data?.zodError?.fieldErrors;
    if (fieldErrors) {
      const messages: string[] = [];
      for (const key of Object.keys(fieldErrors)) {
        const first = fieldErrors[key]?.[0];
        if (!first) continue;
        switch (key) {
          case "description":
            messages.push("Missing required fields: description");
            break;
          case "date":
            messages.push("Invalid input: date must be a valid date");
            break;
          case "totalAmount":
            messages.push("Invalid input: totalAmount must be a number");
            break;
          case "invoiceUrl":
            messages.push("Invalid input: invoiceUrl must be a valid URL");
            break;
          case "fundPoolId":
            messages.push("Fund pool is required");
            break;
          default:
            messages.push(first);
        }
      }
      if (messages.length > 0) return messages.join(". ");
    }
    if (err.message?.includes("Insufficient available funds")) {
      return "Not enough available balance in the selected fund pool to cover this expense.";
    }
    return err.message ?? "Something went wrong";
  }
  return "Something went wrong";
};

const expenseSchema = z.object({
  description: z.string().min(1, "Description is required"),
  date: z.string().min(1, "Date is required"),
  totalAmount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Amount must be a positive number"),
  fundPoolId: z.string().min(1, "Fund pool is required"),
  invoiceUrl: z
    .string()
    .optional()
    .refine((val) => !val || z.string().url().safeParse(val).success, {
      message: "Invoice URL must be a valid URL",
    }),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

function isExpenseFutureDated(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d > today;
}

function mapExpenseRow(e: {
  id: number;
  description: string;
  date: Date;
  totalAmount: unknown;
  invoiceUrl: string | null;
}): Expense {
  const amount =
    typeof e.totalAmount === "number"
      ? e.totalAmount
      : Number(e.totalAmount ?? 0);
  const expenseDate = new Date(e.date);
  return {
    id: e.id,
    description: e.description,
    date: expenseDate,
    totalAmount: amount,
    invoiceUrl: e.invoiceUrl,
    isFutureDated: isExpenseFutureDated(expenseDate),
  };
}

const SORT_FIELDS = [
  { value: "date" as const, label: "Date" },
  { value: "totalAmount" as const, label: "Amount" },
  { value: "description" as const, label: "Description" },
  { value: "id" as const, label: "ID" },
];

const EMPTY_FILTERS = {
  minAmount: "",
  maxAmount: "",
  dateFrom: "",
  dateTo: "",
};

const EMPTY_FORM: ExpenseFormData = {
  description: "",
  date: "",
  totalAmount: "",
  fundPoolId: "",
  invoiceUrl: "",
};

export const ExpensesTable = () => {
  const tableState = useServerTableState<ExpenseSortBy>({
    defaultSortBy: "date",
  });

  const filters = useAdvancedFilters(EMPTY_FILTERS);
  const form = useTableForm<ExpenseFormData>(EMPTY_FORM);

  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null,
  );

  // Reset page when filters change
  React.useEffect(() => {
    tableState.setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.applied.minAmount,
    filters.applied.maxAmount,
    filters.applied.dateFrom,
    filters.applied.dateTo,
  ]);

  const queryInput = React.useMemo(() => {
    const minN =
      filters.applied.minAmount.trim() === ""
        ? NaN
        : Number(filters.applied.minAmount);
    const maxN =
      filters.applied.maxAmount.trim() === ""
        ? NaN
        : Number(filters.applied.maxAmount);
    return {
      page: tableState.page,
      limit: tableState.limit,
      sortBy: tableState.sortBy,
      sortOrder: tableState.sortOrder,
      description: tableState.appliedSearch || undefined,
      minAmount: Number.isFinite(minN) && minN > 0 ? minN : undefined,
      maxAmount: Number.isFinite(maxN) && maxN > 0 ? maxN : undefined,
      startDate: filters.applied.dateFrom
        ? new Date(`${filters.applied.dateFrom}T12:00:00`)
        : undefined,
      endDate: filters.applied.dateTo
        ? new Date(`${filters.applied.dateTo}T12:00:00`)
        : undefined,
    };
  }, [
    tableState.page,
    tableState.limit,
    tableState.sortBy,
    tableState.sortOrder,
    tableState.appliedSearch,
    filters.applied,
  ]);

  const utils = api.useUtils();
  const {
    data: listData,
    isLoading,
    isError,
    isFetching,
    refetch,
    isRefetching,
  } = api.expenses.list.useQuery(queryInput, {
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const pagination = listData?.pagination;

  React.useEffect(() => {
    if (!pagination || pagination.totalPages <= 0) return;
    if (tableState.page > pagination.totalPages)
      tableState.setPage(pagination.totalPages);
  }, [pagination, tableState.page]);

  const { data: fundPools } = api.fundPool.getAll.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const createExpense = api.expenses.create.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.expenses.list.invalidate(),
        utils.fundPool.getAll.invalidate(),
        utils.grant.getAll.invalidate(),
      ]);
      setSuccessMessage("Expense created");
      setTimeout(() => setSuccessMessage(null), 4000);
    },
  });

  const localExpenses: Expense[] = React.useMemo(
    () => (listData?.expenses ?? []).map(mapExpenseRow),
    [listData?.expenses],
  );

  const table = useReactTable<Expense>({
    data: localExpenses,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Seed fundPoolId when form opens
  React.useEffect(() => {
    if (
      form.isAdding &&
      fundPools &&
      fundPools.length > 0 &&
      !form.formData.fundPoolId
    ) {
      form.setFormData({ fundPoolId: String(fundPools[0]!.id) });
    }
  }, [form.isAdding, fundPools]);

  const handleSave = (saveAndAddMore: boolean) => {
    if (!form.validateForm(expenseSchema)) return;
    createExpense.mutate(
      {
        description: form.formData.description,
        date: form.formData.date,
        totalAmount: parseFloat(form.formData.totalAmount),
        fundPoolId: Number(form.formData.fundPoolId),
        invoiceUrl: form.formData.invoiceUrl?.trim() || undefined,
      },
      {
        onSuccess: () => {
          tableState.setPage(1);
          if (saveAndAddMore) {
            form.resetForm();
          } else {
            form.closeForm();
          }
        },
      },
    );
  };

  if (isLoading && !listData) return <div>Loading…</div>;
  if (isError) return <div>Error loading data.</div>;

  const hasDraft = Boolean(
    filters.draft.minAmount.trim() ||
      filters.draft.maxAmount.trim() ||
      filters.draft.dateFrom ||
      filters.draft.dateTo,
  );

  return (
    <div className="relative w-full">
      {isFetching && <FetchingOverlay />}

      <div className="border-t border-border -mx-8 px-8 flex flex-col gap-3 py-4">
        {/* Search row */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[240px] max-w-md flex-1 flex-col gap-1">
            <label
              className="text-xs text-muted-foreground"
              htmlFor="expense-search"
            >
              Description
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="expense-search"
                placeholder="Search by description…"
                value={tableState.draftSearch}
                onChange={(e) => tableState.setDraftSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    tableState.commitSearch();
                  }
                }}
                className="min-w-0 flex-1 bg-white border-[#3FA9A9]"
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0 gap-2 border-[#3FA9A9] bg-white hover:bg-[#3FA9A9]/10"
                onClick={tableState.commitSearch}
              >
                <Search className="h-4 w-4" aria-hidden />
                Search
              </Button>
              <AdvancedFilterPopover
                description="Amount range and expense date range. Click Apply to update results."
                hasApplied={filters.hasApplied}
                hasPending={filters.hasPending}
                hasDraft={hasDraft}
                onApply={() => {
                  filters.apply();
                  tableState.setPage(1);
                }}
                onClear={filters.clear}
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label
                      className="text-xs text-muted-foreground"
                      htmlFor="expense-min-amt"
                    >
                      Min amount
                    </label>
                    <Input
                      id="expense-min-amt"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Min"
                      value={filters.draft.minAmount}
                      onChange={(e) =>
                        filters.setDraft({ minAmount: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label
                      className="text-xs text-muted-foreground"
                      htmlFor="expense-max-amt"
                    >
                      Max amount
                    </label>
                    <Input
                      id="expense-max-amt"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Max"
                      value={filters.draft.maxAmount}
                      onChange={(e) =>
                        filters.setDraft({ maxAmount: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label
                      className="text-xs text-muted-foreground"
                      htmlFor="expense-date-from"
                    >
                      Date from
                    </label>
                    <Input
                      id="expense-date-from"
                      type="date"
                      className="w-full min-w-0"
                      value={filters.draft.dateFrom}
                      onChange={(e) =>
                        filters.setDraft({ dateFrom: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label
                      className="text-xs text-muted-foreground"
                      htmlFor="expense-date-to"
                    >
                      Date to
                    </label>
                    <Input
                      id="expense-date-to"
                      type="date"
                      className="w-full min-w-0"
                      value={filters.draft.dateTo}
                      onChange={(e) =>
                        filters.setDraft({ dateTo: e.target.value })
                      }
                    />
                  </div>
                </div>
              </AdvancedFilterPopover>
            </div>
          </div>
        </div>

        {/* Sort + actions row */}
        <div className="flex flex-wrap items-end gap-3">
          <TableSortControls
            sortFields={SORT_FIELDS}
            sortBy={tableState.sortBy}
            sortOrder={tableState.sortOrder}
            onSortByChange={tableState.setSortBy}
            onSortOrderChange={tableState.setSortOrder}
          />

          <Button
            variant="ghost"
            className="ml-auto text-black hover:bg-transparent"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            {isRefetching ? "Refreshing…" : "Refresh"}
          </Button>

          <Button
            variant="ghost"
            className="text-black hover:bg-transparent"
            onClick={() =>
              exportToCSV(
                ["Description", "Date", "Amount", "Invoice URL"],
                localExpenses.map((e) => [
                  e.description,
                  e.date.toLocaleDateString(),
                  e.totalAmount.toFixed(2),
                  e.invoiceUrl ?? "",
                ]),
                "expense_list",
              )
            }
          >
            Export page
          </Button>

          <Button
            variant="outline"
            className="bg-[#45BAB8] text-white hover:bg-[#45BAB8]"
            onClick={form.openForm}
          >
            <CirclePlus /> Add Expense
          </Button>
        </div>
      </div>

      {successMessage && (
        <p className="text-sm text-green-600 py-2 px-8">{successMessage}</p>
      )}
      {createExpense.error && !form.isAdding && (
        <p className="text-sm text-red-600 py-2 px-8">
          {getFriendlyError(createExpense.error)}
        </p>
      )}

      <div className="-mx-8">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {form.isAdding && (
              <InlineFormRow
                colCount={columns.length}
                onSave={() => handleSave(false)}
                onSaveAndAddMore={() => handleSave(true)}
                onCancel={form.closeForm}
                isSaving={createExpense.isPending}
                error={
                  createExpense.error
                    ? getFriendlyError(createExpense.error)
                    : null
                }
              >
                <TableCell>
                  <Input
                    value={form.formData.description}
                    onChange={(e) =>
                      form.setFormData({ description: e.target.value })
                    }
                    placeholder="Description"
                    className={`bg-white border-[#3FA9A9] ${form.formErrors.description ? "border-red-500" : ""}`}
                  />
                  {form.formErrors.description && (
                    <p className="text-xs text-red-500 mt-1">
                      {form.formErrors.description}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    value={form.formData.date}
                    onChange={(e) => form.setFormData({ date: e.target.value })}
                    className={`bg-white border-[#3FA9A9] ${form.formErrors.date ? "border-red-500" : ""}`}
                  />
                  {form.formErrors.date && (
                    <p className="text-xs text-red-500 mt-1">
                      {form.formErrors.date}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.formData.totalAmount}
                    onChange={(e) =>
                      form.setFormData({ totalAmount: e.target.value })
                    }
                    placeholder="Amount"
                    className={`bg-white border-[#3FA9A9] ${form.formErrors.totalAmount ? "border-red-500" : ""}`}
                  />
                  {form.formErrors.totalAmount && (
                    <p className="text-xs text-red-500 mt-1">
                      {form.formErrors.totalAmount}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    type="url"
                    value={form.formData.invoiceUrl ?? ""}
                    onChange={(e) =>
                      form.setFormData({ invoiceUrl: e.target.value })
                    }
                    placeholder="Invoice URL (optional)"
                    className={`bg-white border-[#3FA9A9] ${form.formErrors.invoiceUrl ? "border-red-500" : ""}`}
                  />
                  {form.formErrors.invoiceUrl && (
                    <p className="text-xs text-red-500 mt-1">
                      {form.formErrors.invoiceUrl}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  {fundPools && fundPools.length > 0 ? (
                    <>
                      <select
                        value={form.formData.fundPoolId}
                        onChange={(e) =>
                          form.setFormData({ fundPoolId: e.target.value })
                        }
                        className={`w-full h-9 bg-white border rounded-md px-2 border-[#3FA9A9] ${form.formErrors.fundPoolId ? "border-red-500" : ""}`}
                      >
                        <option value="" disabled>
                          Select fund pool
                        </option>
                        {fundPools.map((pool) => (
                          <option key={pool.id} value={pool.id}>
                            {pool.category}
                          </option>
                        ))}
                      </select>
                      {form.formErrors.fundPoolId && (
                        <p className="text-xs text-red-500 mt-1">
                          {form.formErrors.fundPoolId}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No fund pools available
                    </p>
                  )}
                </TableCell>
              </InlineFormRow>
            )}

            {table.getRowModel().rows.length > 0
              ? table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "hover:bg-transparent",
                      row.original.isFutureDated && "bg-muted/30",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : !form.isAdding && <TableEmptyRow colCount={columns.length} />}
          </TableBody>

          <TableFooter />
        </Table>
      </div>

      <TablePagination
        pagination={pagination}
        limit={tableState.limit}
        onPageChange={tableState.setPage}
        onLimitChange={tableState.setLimit}
      />
    </div>
  );
};
