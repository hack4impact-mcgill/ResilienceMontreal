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
import { useQuery } from "@tanstack/react-query";
import { fetchExpenses } from "@/lib/api";
import { z } from "zod";

// Validation schema
const expenseSchema = z.object({
  client: z.string().min(1, "Client is required"),
  spendingCategory: z.array(z.string()).min(1, "Select at least one category"),
  purchaseDate: z.string().min(1, "Purchase date is required"),
  clientEmail: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  notes: z.string().optional().default(""),
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Amount must be a positive number"),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

// ------------------------------------------------------------
// EXPORT EXPENSES TO CSV
// ------------------------------------------------------------
const exportToCSV = (expenses: Expense[]) => {
  if (!expenses.length) return;

  // CSV header
  const header = [
    "Client",
    "Spending Category",
    "Purchase Date",
    "Client Email",
    "Phone Number",
    "Notes",
    "Amount",
  ];

  // CSV rows
  const rows = expenses.map((e) => [
    e.client,
    e.spendingCategory.join("; "),
    e.purchaseDate.toLocaleDateString(),
    e.clientEmail,
    e.phoneNumber,
    e.notes,
    e.amount.toFixed(2),
  ]);

  // combine header + rows
  const csvContent = [header, ...rows].map((row) => row.join(",")).join("\n");

  // create filename with current date
  const now = new Date();
  const dateStr = `${now.getMonth() + 1}-${now.getDate()}-${now.getFullYear().toString().slice(-2)}`; // MM-DD-YY
  const fileName = `expense_list_${dateStr}.csv`;

  // create a blob and trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ------------------------------------------------------------
// MAIN TABLE COMPONENT
// ------------------------------------------------------------
export const ExpensesTable = () => {
  const [localExpenses, setLocalExpenses] = React.useState<Expense[]>([]);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const [filterColumn, setFilterColumn] = React.useState<
    "client" | "spendingCategory" | "clientEmail"
  >("client");
  const [filterMenuOpen, setFilterMenuOpen] = React.useState(false);

  const [isAdding, setIsAdding] = React.useState(false);
  const [formData, setFormData] = React.useState<ExpenseFormData>({
    client: "",
    spendingCategory: [],
    purchaseDate: "",
    clientEmail: "",
    phoneNumber: "",
    notes: "",
    amount: "",
  });
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>(
    {},
  );

  // Spending category options
  const spendingCategories = [
    "Office Supplies",
    "Rent",
    "Utilities",
    "Maintenance",
    "Marketing",
    "Software",
    "Services",
    "Internet",
    "Insurance",
    "Professional Services",
    "Other",
  ];

  // fetch initial server data
  const {
    data: fetchedExpenses,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["expenses"],
    queryFn: fetchExpenses,
  });

  // merge server-loaded + local-added
  React.useEffect(() => {
    if (fetchedExpenses) setLocalExpenses(fetchedExpenses);
  }, [fetchedExpenses]);

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
    if (col === "client") return "Client";
    if (col === "spendingCategory") return "Spending Category";
    if (col === "clientEmail") return "Client Email";
    return col;
  };

  const resetForm = () => {
    setFormData({
      client: "",
      spendingCategory: [],
      purchaseDate: "",
      clientEmail: "",
      phoneNumber: "",
      notes: "",
      amount: "",
    });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const result = expenseSchema.safeParse(formData);
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

    const newExpense: Expense = {
      id: Date.now().toString(),
      client: formData.client,
      spendingCategory: formData.spendingCategory,
      purchaseDate: new Date(formData.purchaseDate),
      clientEmail: formData.clientEmail,
      phoneNumber: formData.phoneNumber,
      notes: formData.notes || "",
      amount: parseFloat(formData.amount),
    };

    setLocalExpenses((prev) => {
      const updated = [...prev, newExpense];
      return updated;
    });

    if (saveAndAddMore) {
      resetForm();
      // Keep form open
    } else {
      resetForm();
      setIsAdding(false);
    }

    // force React Table to recompute with new data
    setTimeout(() => {
      table.setPageIndex(table.getPageCount() - 1);
    }, 10);
  };

  const handleCancel = () => {
    resetForm();
    setIsAdding(false);
  };

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error loading data.</div>;

  type FilterColumn = "client" | "spendingCategory" | "clientEmail";
  return (
    <div className="w-full">
      {/* Filter Row */}
      <div className="border-t border-border -mx-8 px-8 flex items-center py-4">
        {/* Search Input */}
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

        {/* Filter Dropdown */}
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
            {["client", "spendingCategory", "clientEmail"].map((col) => (
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

        {/* Export Button */}
        <Button
          variant="ghost"
          className="ml-auto text-black hover:bg-transparent"
          onClick={() => exportToCSV(localExpenses)}
        >
          Export
        </Button>

        {/* Add Expense Button */}
        <Button
          variant="outline"
          className="bg-[#45BAB8] text-white hover:bg-[#45BAB8]"
          onClick={() => setIsAdding(true)}
        >
          <CirclePlus /> Add Expense
        </Button>
      </div>

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
            {/* Inline Add Form Row */}
            {isAdding && (
              <TableRow className="bg-[#D1EDED] hover:bg-[#D1EDED]">
                <TableCell>
                  <Input
                    value={formData.client}
                    onChange={(e) =>
                      setFormData({ ...formData, client: e.target.value })
                    }
                    placeholder="Client"
                    className={`bg-white border-[#3FA9A9] ${formErrors.client ? "border-red-500" : ""}`}
                  />
                  {formErrors.client && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.client}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <select
                    multiple
                    size={3}
                    value={formData.spendingCategory}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions).map(
                        (o) => o.value,
                      );
                      setFormData({ ...formData, spendingCategory: selected });
                    }}
                    className={`flex h-10 w-full rounded-md border border-[#3FA9A9] bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                      formErrors.spendingCategory ? "border-red-500" : ""
                    }`}
                  >
                    {spendingCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  {formErrors.spendingCategory && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.spendingCategory}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) =>
                      setFormData({ ...formData, purchaseDate: e.target.value })
                    }
                    className={`bg-white border-[#3FA9A9] ${formErrors.purchaseDate ? "border-red-500" : ""}`}
                  />
                  {formErrors.purchaseDate && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.purchaseDate}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, clientEmail: e.target.value })
                    }
                    placeholder="Email"
                    className={`bg-white border-[#3FA9A9] ${formErrors.clientEmail ? "border-red-500" : ""}`}
                  />
                  {formErrors.clientEmail && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.clientEmail}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, phoneNumber: e.target.value })
                    }
                    placeholder="Phone"
                    className={`bg-white border-[#3FA9A9] ${formErrors.phoneNumber ? "border-red-500" : ""}`}
                  />
                  {formErrors.phoneNumber && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.phoneNumber}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Notes"
                    className="max-w-xs bg-white border-[#3FA9A9]"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    placeholder="Amount"
                    className={`bg-white border-[#3FA9A9] ${formErrors.amount ? "border-red-500" : ""}`}
                  />
                  {formErrors.amount && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.amount}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  {/* Actions column - empty in form row */}
                </TableCell>
              </TableRow>
            )}
            {/* Buttons Row */}
            {isAdding && (
              <TableRow className="bg-[#D1EDED] hover:bg-[#D1EDED]">
                <TableCell
                  colSpan={columns.length}
                  className="py-4 px-20
"
                >
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSave(false)}
                      className="bg-[#45BAB8] text-white hover:bg-[#45BAB8]"
                    >
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSave(true)}
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
                  <TableRow key={row.id} className="">
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

      {/* Pagination */}
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
