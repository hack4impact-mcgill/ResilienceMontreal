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

// ------------------------------------------------------------
// ADD EXPENSE MODAL
// ------------------------------------------------------------
function AddExpenseModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (expense: Expense) => void;
}) {
  const [client, setClient] = React.useState("");
  const [spendingCategory, setSpendingCategory] = React.useState("");
  const [purchaseDate, setPurchaseDate] = React.useState("");
  const [clientEmail, setClientEmail] = React.useState("");
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [amount, setAmount] = React.useState("");

  const resetFields = () => {
    setClient("");
    setSpendingCategory("");
    setPurchaseDate("");
    setClientEmail("");
    setPhoneNumber("");
    setNotes("");
    setAmount("");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-[500px] max-h-[90vh] overflow-y-auto shadow-xl">
        <h2 className="text-xl font-semibold mb-4 text-center">Add Expense</h2>

        <div className="space-y-3">
          <Input
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="Client"
          />
          <Input
            value={spendingCategory}
            onChange={(e) => setSpendingCategory(e.target.value)}
            placeholder="Spending Category"
          />
          <Input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            placeholder="Purchase Date"
          />
          <Input
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            placeholder="Client Email"
          />
          <Input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="Phone Number"
          />
          <Input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => {
              resetFields();
              onClose();
            }}
          >
            Cancel
          </Button>

          <Button
            onClick={() => {
              const newExpense: Expense = {
                id: Date.now().toString(),
                client,
                spendingCategory,
                purchaseDate: new Date(purchaseDate),
                clientEmail,
                phoneNumber,
                notes,
                amount: parseFloat(amount) || 0,
              };

              onSubmit(newExpense);
              resetFields();
              onClose();
            }}
          >
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}

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
    e.spendingCategory,
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

  const [addModalOpen, setAddModalOpen] = React.useState(false);

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
          className="max-w-sm"
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
          onClick={() => setAddModalOpen(true)}
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
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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
            ) : (
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

      {/* Add Expense Modal */}
      <AddExpenseModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmit={(newExpense) => {
          setLocalExpenses((prev) => {
            const updated = [...prev, newExpense];
            return updated;
          });

          // force React Table to recompute with new data
          setTimeout(() => {
            table.setPageIndex(table.getPageCount() - 1);
          }, 10);
        }}
      />
    </div>
  );
};
