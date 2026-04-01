"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";

import { CirclePlus, ListFilter, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
import { TRPCClientError } from "@trpc/client";
import { z } from "zod";
import { cn } from "@/lib/utils";

// Friendly error messages for tRPC/zod (same as original expenses page)
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
          default:
            messages.push(first);
        }
      }
      if (messages.length > 0) return messages.join(". ");
    }
    return err.message ?? "Something went wrong";
  }
  if (
    err &&
    typeof err === "object" &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
  ) {
    return (err as { message: string }).message ?? "Something went wrong";
  }
  return "Something went wrong";
};

// Validation schema (matches tRPC/Prisma: description, date, totalAmount, invoiceUrl)
const expenseSchema = z.object({
  description: z.string().min(1, "Description is required"),
  date: z.string().min(1, "Date is required"),
  totalAmount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Amount must be a positive number"),
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

// Map tRPC/Prisma list item to table row (Decimal may come as number or string)
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

// ------------------------------------------------------------
// EXPORT EXPENSES TO CSV
// ------------------------------------------------------------
const exportToCSV = (expenses: Expense[]) => {
  if (!expenses.length) return;

  const header = ["Description", "Date", "Amount", "Invoice URL"];
  const rows = expenses.map((e) => [
    e.description,
    e.date.toLocaleDateString(),
    e.totalAmount.toFixed(2),
    e.invoiceUrl ?? "",
  ]);
  const csvContent = [header, ...rows].map((row) => row.join(",")).join("\n");
  const now = new Date();
  const dateStr = `${now.getMonth() + 1}-${now.getDate()}-${now.getFullYear().toString().slice(-2)}`;
  const fileName = `expense_list_${dateStr}.csv`;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ------------------------------------------------------------
// MAIN TABLE COMPONENT
// ------------------------------------------------------------
export const ExpensesTable = () => {
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState<30 | 50 | 100>(30);
  const [sortBy, setSortBy] = React.useState<
    "date" | "totalAmount" | "description" | "id"
  >("date");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  /** Draft text in the search field (does not hit the API until Enter). */
  const [searchDescription, setSearchDescription] = React.useState("");
  /** Committed filter sent to `expenses.list` (set when user presses Enter). */
  const [appliedDescription, setAppliedDescription] = React.useState("");
  const [minAmountInput, setMinAmountInput] = React.useState("");
  const [maxAmountInput, setMaxAmountInput] = React.useState("");
  const [dateFromInput, setDateFromInput] = React.useState("");
  const [dateToInput, setDateToInput] = React.useState("");

  const commitDescriptionSearch = React.useCallback(() => {
    setAppliedDescription(searchDescription.trim());
  }, [searchDescription]);

  React.useEffect(() => {
    setPage(1);
  }, [
    appliedDescription,
    minAmountInput,
    maxAmountInput,
    dateFromInput,
    dateToInput,
    sortBy,
    sortOrder,
    limit,
  ]);

  const hasAdvancedFilters = Boolean(
    minAmountInput.trim() ||
      maxAmountInput.trim() ||
      dateFromInput ||
      dateToInput,
  );

  const clearAdvancedFilters = () => {
    setMinAmountInput("");
    setMaxAmountInput("");
    setDateFromInput("");
    setDateToInput("");
  };

  const queryInput = React.useMemo(() => {
    const minRaw = minAmountInput.trim();
    const maxRaw = maxAmountInput.trim();
    const minN = minRaw === "" ? NaN : Number(minRaw);
    const maxN = maxRaw === "" ? NaN : Number(maxRaw);
    return {
      page,
      limit,
      sortBy,
      sortOrder,
      description: appliedDescription || undefined,
      minAmount: Number.isFinite(minN) && minN > 0 ? minN : undefined,
      maxAmount: Number.isFinite(maxN) && maxN > 0 ? maxN : undefined,
      startDate: dateFromInput
        ? new Date(`${dateFromInput}T12:00:00`)
        : undefined,
      endDate: dateToInput ? new Date(`${dateToInput}T12:00:00`) : undefined,
    };
  }, [
    page,
    limit,
    sortBy,
    sortOrder,
    appliedDescription,
    minAmountInput,
    maxAmountInput,
    dateFromInput,
    dateToInput,
  ]);

  const [isAdding, setIsAdding] = React.useState(false);
  const [formData, setFormData] = React.useState<ExpenseFormData>({
    description: "",
    date: "",
    totalAmount: "",
    invoiceUrl: "",
  });
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>(
    {},
  );
  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null,
  );

  const utils = api.useContext();
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
    if (page > pagination.totalPages) setPage(pagination.totalPages);
  }, [pagination, page]);

  const createExpense = api.expenses.create.useMutation({
    onSuccess: () => {
      void utils.expenses.list.invalidate();
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
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      columnVisibility,
      rowSelection,
    },
  });

  const resetForm = () => {
    setFormData({
      description: "",
      date: "",
      totalAmount: "",
      invoiceUrl: "",
    });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const result = expenseSchema.safeParse({
      ...formData,
      invoiceUrl: formData.invoiceUrl || undefined,
    });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setFormErrors(errors);
      return false;
    }
    setFormErrors({});
    return true;
  };

  const handleSave = (saveAndAddMore: boolean) => {
    if (!validateForm()) return;

    createExpense.mutate(
      {
        description: formData.description,
        date: formData.date,
        totalAmount: parseFloat(formData.totalAmount),
        invoiceUrl: formData.invoiceUrl?.trim() || undefined,
      },
      {
        onSuccess: () => {
          setPage(1);
          if (saveAndAddMore) {
            resetForm();
          } else {
            resetForm();
            setIsAdding(false);
          }
        },
      },
    );
  };

  const handleCancel = () => {
    resetForm();
    setIsAdding(false);
  };

  const createSample = () => {
    const sampleAmount = "12.34";
    const sampleDescription = "Sample expense";
    const sampleDateStr = new Date().toISOString().slice(0, 10);
    createExpense.mutate({
      totalAmount: parseFloat(sampleAmount),
      description: sampleDescription,
      date: sampleDateStr,
      invoiceUrl: undefined,
    });
  };

  if (isLoading && !listData) return <div>Loading...</div>;
  if (isError) return <div>Error loading data.</div>;

  return (
    <div className="relative w-full">
      {isFetching ? (
        <div
          className="pointer-events-none absolute inset-0 z-10 bg-background/40"
          aria-hidden
        />
      ) : null}
      {/* Search & filters */}
      <div className="border-t border-border -mx-8 px-8 flex flex-col gap-3 py-4">
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
                value={searchDescription}
                onChange={(e) => setSearchDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitDescriptionSearch();
                  }
                }}
                className="min-w-0 flex-1 bg-white border-[#3FA9A9]"
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0 gap-2 border-[#3FA9A9] bg-white hover:bg-[#3FA9A9]/10"
                onClick={commitDescriptionSearch}
              >
                <Search className="h-4 w-4" aria-hidden />
                Search
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "shrink-0 gap-2",
                      hasAdvancedFilters && "border-[#45BAB8] bg-[#45BAB8]/10",
                    )}
                  >
                    <ListFilter className="h-4 w-4" aria-hidden />
                    Filter
                    {hasAdvancedFilters ? (
                      <span
                        className="flex h-2 w-2 rounded-full bg-[#45BAB8]"
                        aria-hidden
                      />
                    ) : null}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-80 p-0"
                  align="start"
                  side="bottom"
                >
                  <div className="border-b px-3 py-2">
                    <p className="text-sm font-semibold">Filters</p>
                    <p className="text-xs text-muted-foreground">
                      Amount range and expense date range
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 p-3">
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
                          value={minAmountInput}
                          onChange={(e) => setMinAmountInput(e.target.value)}
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
                          value={maxAmountInput}
                          onChange={(e) => setMaxAmountInput(e.target.value)}
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
                          value={dateFromInput}
                          onChange={(e) => setDateFromInput(e.target.value)}
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
                          value={dateToInput}
                          onChange={(e) => setDateToInput(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="self-start text-muted-foreground"
                      onClick={clearAdvancedFilters}
                      disabled={!hasAdvancedFilters}
                    >
                      Clear filters
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label
              className="text-xs text-muted-foreground"
              htmlFor="expense-sort-by"
            >
              Sort by
            </label>
            <select
              id="expense-sort-by"
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as
                    | "date"
                    | "totalAmount"
                    | "description"
                    | "id",
                )
              }
            >
              <option value="date">Date</option>
              <option value="totalAmount">Amount</option>
              <option value="description">Description</option>
              <option value="id">ID</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label
              className="text-xs text-muted-foreground"
              htmlFor="expense-sort-order"
            >
              Order
            </label>
            <select
              id="expense-sort-order"
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label
              className="text-xs text-muted-foreground"
              htmlFor="expense-page-size"
            >
              Rows per page
            </label>
            <select
              id="expense-page-size"
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={limit}
              onChange={(e) =>
                setLimit(Number(e.target.value) as 30 | 50 | 100)
              }
            >
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <Button
            variant="ghost"
            className="ml-auto text-black hover:bg-transparent"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            {isRefetching ? "Refreshing..." : "Refresh"}
          </Button>

          <Button
            variant="ghost"
            className="text-black hover:bg-transparent"
            onClick={() => exportToCSV(localExpenses)}
          >
            Export page
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={createSample}
            disabled={createExpense.isPending}
            className="border px-4 py-2"
          >
            Quick sample
          </Button>

          <Button
            variant="outline"
            className="bg-[#45BAB8] text-white hover:bg-[#45BAB8]"
            onClick={() => setIsAdding(true)}
          >
            <CirclePlus /> Add Expense
          </Button>
        </div>
      </div>

      {successMessage && (
        <p className="text-sm text-green-600 py-2 px-8">{successMessage}</p>
      )}
      {createExpense.error && !isAdding && (
        <p className="text-sm text-red-600 py-2 px-8">
          {getFriendlyError(createExpense.error)}
        </p>
      )}

      {/* Table */}
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
            {isAdding && (
              <TableRow className="bg-[#D1EDED] hover:bg-[#D1EDED]">
                <TableCell>
                  <Input
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Description"
                    className={`bg-white border-[#3FA9A9] ${formErrors.description ? "border-red-500" : ""}`}
                  />
                  {formErrors.description && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.description}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className={`bg-white border-[#3FA9A9] ${formErrors.date ? "border-red-500" : ""}`}
                  />
                  {formErrors.date && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.date}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.totalAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, totalAmount: e.target.value })
                    }
                    placeholder="Amount"
                    className={`bg-white border-[#3FA9A9] ${formErrors.totalAmount ? "border-red-500" : ""}`}
                  />
                  {formErrors.totalAmount && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.totalAmount}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    type="url"
                    value={formData.invoiceUrl ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, invoiceUrl: e.target.value })
                    }
                    placeholder="Invoice URL (optional)"
                    className={`bg-white border-[#3FA9A9] ${formErrors.invoiceUrl ? "border-red-500" : ""}`}
                  />
                  {formErrors.invoiceUrl && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.invoiceUrl}
                    </p>
                  )}
                </TableCell>
                <TableCell />
              </TableRow>
            )}
            {isAdding && createExpense.error && (
              <TableRow className="bg-[#D1EDED] hover:bg-[#D1EDED]">
                <TableCell colSpan={columns.length} className="py-2 px-20">
                  <p className="text-sm text-red-600">
                    {getFriendlyError(createExpense.error)}
                  </p>
                </TableCell>
              </TableRow>
            )}
            {isAdding && (
              <TableRow className="bg-[#D1EDED] hover:bg-[#D1EDED]">
                <TableCell colSpan={columns.length} className="py-4 px-20">
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSave(false)}
                      disabled={createExpense.isPending}
                      className="bg-[#45BAB8] text-white hover:bg-[#45BAB8]"
                    >
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSave(true)}
                      disabled={createExpense.isPending}
                      className="bg-[#45BAB8] text-white hover:bg-[#45BAB8]"
                    >
                      Save & Add More
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
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
              : !isAdding && (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
          </TableBody>

          <TableFooter />
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 py-4 px-8">
        <p className="text-sm text-muted-foreground">
          {pagination ? (
            <>
              Showing{" "}
              {pagination.totalCount === 0
                ? 0
                : (pagination.currentPage - 1) * pagination.pageSize + 1}
              –
              {(pagination.currentPage - 1) * pagination.pageSize +
                pagination.returnedCount}{" "}
              of {pagination.totalCount} expenses
              {pagination.totalPages > 0
                ? ` · Page ${pagination.currentPage} of ${pagination.totalPages}`
                : null}
            </>
          ) : null}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!pagination?.hasPreviousPage}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!pagination?.hasNextPage}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};
