"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
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
import { api } from "~/trpc/react";
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
type SortByField = "firstName" | "lastName" | "createdAt" | "leaseEnd" | "workerId";

// ============================================================
// EXPORT TO CSV
// ============================================================
const exportToCSV = (clients: any[]) => {
  if (!clients.length) return;

  const header = [
    "First Name",
    "Last Name",
    "Email",
    "Lease Start Date",
    "Lease End Date",
  ];

  const rows = clients.map((c) => [
    c.firstName,
    c.lastName,
    c.email,
    c.leaseStart ? new Date(c.leaseStart).toLocaleDateString() : "",
    c.leaseEnd ? new Date(c.leaseEnd).toLocaleDateString() : "",
  ]);

  const csvContent = [header, ...rows].map((row) => row.join(",")).join("\n");

  const now = new Date();
  const dateStr = `${now.getMonth() + 1}-${now.getDate()}-${now.getFullYear().toString().slice(-2)}`;
  const fileName = `client_list_${dateStr}.csv`;

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ============================================================
// MAIN TABLE COMPONENT
// ============================================================
export const ClientsTable = () => {
  // Pagination & Filter State
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [sortBy, setSortBy] = React.useState<SortByField>("createdAt");
  const [filterColumn, setFilterColumn] = React.useState<"firstName" | "lastName" | "email">("email");
  const [filterMenuOpen, setFilterMenuOpen] = React.useState(false);

  // Add Client State
  const [isAdding, setIsAdding] = React.useState(false);
  const [formData, setFormData] = React.useState<ClientFormData>({
    firstName: "",
    lastName: "",
    email: "",
    leaseStart: "",
    leaseEnd: "",
  });
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  // Fetch clients with filters and pagination
  const { data, isLoading, isError } = api.client.getClients.useQuery({
    page,
    limit: 20,
    sortBy,
    sortOrder: "desc",
    search: search || undefined,
  });

  // Map API response to client format for table
  const clients = data?.data.map((c) => ({
    id: c.id.toString(),
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email ?? "",
    leaseStartDate: c.leaseStart ? new Date(c.leaseStart) : new Date(),
    leaseEndDate: c.leaseEnd ? new Date(c.leaseEnd) : new Date(),
  })) ?? [];

  const table = useReactTable({
    data: clients,
    columns,
    getCoreRowModel: getCoreRowModel(),
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

    // TODO: Call mutation to add client to database
    // For now, just close the form
    if (!saveAndAddMore) {
      resetForm();
      setIsAdding(false);
    } else {
      resetForm();
    }
  };

  const handleCancel = () => {
    resetForm();
    setIsAdding(false);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1); // Reset to page 1 when searching
  };

  const handleSortChange = (newSortBy: SortByField) => {
    setSortBy(newSortBy);
    setPage(1); // Reset to page 1 when changing sort
  };

  if (isLoading) return <div className="p-8">Loading clients...</div>;
  if (isError) return <div className="p-8 text-red-500">Error loading clients.</div>;

  const metadata = data?.metadata;

  return (
    <div className="w-full">
      {/* Top Messages */}
      <div className="border-t border-border -mx-8 px-8 py-4">
        <div className="flex flex-row items-start gap-10">
          <div className="flex flex-col">
            <span className="text-green-600 font-bold text-2xl">$0000</span>
            <span className="text-black text-sm -mt-1">available</span>
          </div>
          <div className="flex flex-col">
            <span className="text-red-600 font-bold text-2xl">X days</span>
            <span className="text-black text-sm -mt-1">
              until next grant is due
            </span>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="border-t border-border -mx-8 px-8 flex items-center py-4">
        {/* Search Input */}
        <Input
          placeholder={`Search by ${prettyLabel(filterColumn)}...`}
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
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
              <span>Sort</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start">
            {(["createdAt", "firstName", "lastName", "leaseEnd"] as const).map((col) => (
              <DropdownMenuItem
                key={col}
                onClick={() => {
                  handleSortChange(col);
                  setFilterMenuOpen(false);
                }}
                className="flex items-center gap-2"
              >
                {sortBy === col ? (
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
          onClick={() => exportToCSV(clients)}
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
      <div className="flex items-center justify-between py-4 px-8">
        <div className="text-sm text-gray-600">
          Page {metadata?.page} of {metadata?.totalPages} | {metadata?.total} total clients
        </div>
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={!metadata?.hasPrevPage}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={!metadata?.hasNextPage}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};
