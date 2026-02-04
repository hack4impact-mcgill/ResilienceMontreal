"use client";

import * as React from "react";
import {
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";

import { ListFilter, Check, CirclePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  return {
    id: e.id,
    description: e.description,
    date: new Date(e.date),
    totalAmount: amount,
    invoiceUrl: e.invoiceUrl,
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
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const [filterColumn, setFilterColumn] = React.useState<
    "description" | "totalAmount"
  >("description");
  const [filterMenuOpen, setFilterMenuOpen] = React.useState(false);

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

  const {
    data: listData,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = api.expenses.list.useQuery({ page: 1, limit: 100 });
  const createExpense = api.expenses.create.useMutation({
    onSuccess: () => {
      refetch();
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
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const prettyLabel = (col: string) => {
    if (col === "description") return "Description";
    if (col === "totalAmount") return "Amount";
    return col;
  };

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
          if (saveAndAddMore) {
            resetForm();
          } else {
            resetForm();
            setIsAdding(false);
          }
          setTimeout(() => {
            table.setPageIndex(Math.max(0, table.getPageCount() - 1));
          }, 10);
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

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error loading data.</div>;

  type FilterColumn = "description" | "totalAmount";
  return (
    <div className="w-full">
      {/* Filter Row */}
      <div className="border-t border-border -mx-8 px-8 flex items-center py-4">
        <Input
          placeholder={`Search by ${prettyLabel(filterColumn)}...`}
          value={
            (table.getColumn(filterColumn)?.getFilterValue() as string) ?? ""
          }
          onChange={(e) =>
            table.getColumn(filterColumn)?.setFilterValue(e.target.value)
          }
          className="max-w-sm bg-white border-[#3FA9A9]"
        />

        <DropdownMenu open={filterMenuOpen} onOpenChange={setFilterMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="ml-2 flex items-center gap-2 px-2 py-1 h-auto hover:bg-transparent"
            >
              <ListFilter
                className={`transition-transform ${filterMenuOpen ? "rotate-90" : "rotate-0"}`}
              />
              <span>Filter</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {["description", "totalAmount"].map((col) => (
              <DropdownMenuItem
                key={col}
                onClick={() => {
                  table.getColumn(filterColumn)?.setFilterValue("");
                  setFilterColumn(col as FilterColumn);
                  setFilterMenuOpen(false);
                }}
                className="flex items-center gap-2"
              >
                {filterColumn === col ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="h-4 w-4 opacity-0" />
                )}
                {prettyLabel(col)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

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
          Export
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
                  <TableRow key={row.id} className="hover:bg-transparent">
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

      <div className="flex items-center justify-end space-x-2 py-4 px-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
};
