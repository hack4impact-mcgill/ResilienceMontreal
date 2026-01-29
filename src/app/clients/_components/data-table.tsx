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

import { columns, Client } from "./columns";
import { useQuery } from "@tanstack/react-query";
import { fetchClients } from "@/lib/api";
import { z } from "zod";

// Validation schema (inline add row)
const clientSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  leaseStart: z.string().min(1, "Lease start date is required"),
  leaseEnd: z.string().min(1, "Lease end date is required"),
});

type ClientFormData = z.infer<typeof clientSchema>;

// ------------------------------------------------------------
// EXPORT CLIENTS TO CSV
// ------------------------------------------------------------
const exportToCSV = (clients: Client[]) => {
  if (!clients.length) return;

  // CSV header
  const header = [
    "First Name",
    "Last Name",
    "Email",
    "Lease Start Date",
    "Lease End Date",
  ];

  // CSV rows
  const rows = clients.map((c) => [
    c.firstName,
    c.lastName,
    c.email,
    c.leaseStartDate.toLocaleDateString(),
    c.leaseEndDate.toLocaleDateString(),
  ]);

  // combine header + rows
  const csvContent = [header, ...rows].map((row) => row.join(",")).join("\n");

  // create filename with current date
  const now = new Date();
  const dateStr = `${now.getMonth() + 1}-${now.getDate()}-${now.getFullYear().toString().slice(-2)}`; // MM-DD-YY
  const fileName = `client_list_${dateStr}.csv`;

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
export const ClientsTable = () => {
  const [localClients, setLocalClients] = React.useState<Client[]>([]);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const [filterColumn, setFilterColumn] = React.useState<
    "firstName" | "lastName" | "email"
  >("email");
  const [filterMenuOpen, setFilterMenuOpen] = React.useState(false);

  const [isAdding, setIsAdding] = React.useState(false);
  const [formData, setFormData] = React.useState<ClientFormData>({
    firstName: "",
    lastName: "",
    email: "",
    leaseStart: "",
    leaseEnd: "",
  });
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>(
    {},
  );

  // fetch initial server data
  const {
    data: fetchedClients,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["clients"],
    queryFn: fetchClients,
  });

  // merge server-loaded + local-added
  React.useEffect(() => {
    if (fetchedClients) setLocalClients(fetchedClients);
  }, [fetchedClients]);

  const table = useReactTable<Client>({
    data: localClients,
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
    if (col === "firstName") return "First Name";
    if (col === "lastName") return "Last Name";
    if (col === "email") return "Email";
    return col;
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      leaseStart: "",
      leaseEnd: "",
    });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const result = clientSchema.safeParse(formData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) errors[err.path[0] as string] = err.message;
      });
      setFormErrors(errors);
      return false;
    }
    setFormErrors({});
    return true;
  };

  const handleSave = (saveAndAddMore: boolean) => {
    if (!validateForm()) return;

    const newClient: Client = {
      id: Date.now().toString(),
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      leaseStartDate: new Date(formData.leaseStart),
      leaseEndDate: new Date(formData.leaseEnd),
    };

    setLocalClients((prev) => [...prev, newClient]);

    if (saveAndAddMore) {
      resetForm();
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

  type FilterColumn = "firstName" | "lastName" | "email";
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
            {["firstName", "lastName", "email"].map((col) => (
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
          onClick={() => exportToCSV(localClients)}
        >
          Export
        </Button>

        {/* Add Client Button */}
        <Button
          variant="outline"
          className="bg-[#45BAB8] text-white hover:bg-[#45BAB8]"
          onClick={() => setIsAdding(true)}
        >
          <CirclePlus /> Add Client
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
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    placeholder="First Name"
                    className={`bg-white border-[#3FA9A9] ${formErrors.firstName ? "border-red-500" : ""}`}
                  />
                  {formErrors.firstName && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.firstName}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    placeholder="Last Name"
                    className={`bg-white border-[#3FA9A9] ${formErrors.lastName ? "border-red-500" : ""}`}
                  />
                  {formErrors.lastName && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.lastName}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="Email"
                    className={`bg-white border-[#3FA9A9] ${formErrors.email ? "border-red-500" : ""}`}
                  />
                  {formErrors.email && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.email}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    value={formData.leaseStart}
                    onChange={(e) =>
                      setFormData({ ...formData, leaseStart: e.target.value })
                    }
                    className={`bg-white border-[#3FA9A9] ${formErrors.leaseStart ? "border-red-500" : ""}`}
                  />
                  {formErrors.leaseStart && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.leaseStart}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    value={formData.leaseEnd}
                    onChange={(e) =>
                      setFormData({ ...formData, leaseEnd: e.target.value })
                    }
                    className={`bg-white border-[#3FA9A9] ${formErrors.leaseEnd ? "border-red-500" : ""}`}
                  />
                  {formErrors.leaseEnd && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.leaseEnd}
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
                <TableCell colSpan={columns.length} className="py-4 px-20">
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
