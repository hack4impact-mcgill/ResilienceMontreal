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
import { api } from "~/trpc/react";


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

import { columns, Worker } from "./columns";

type PrismaClient = {
  id: number;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  landlordName?: string | null;
  leaseStart?: Date | null;
  leaseEnd?: Date | null;
  dateOfBirth: Date;
  workerId: string;
  worker?: {
    name: string;
    email: string;
    supabaseId: string;
    role: string;
    isConfirmed: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
};

type Client = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  leaseStartDate: Date;
  leaseEndDate: Date;
  workerName?: string;
};
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
    "Intervention Worker",
  ];

  // CSV rows
  const rows = clients.map((c) => [
    c.firstName,
    c.lastName,
    c.email,
    c.leaseStartDate.toLocaleDateString(),
    c.leaseEndDate.toLocaleDateString(),
    c.workerName || "-",
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
  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<ClientFormData | null>(null);
  const [editWorker, setEditWorker] = useState<{ id: string; name: string } | null>(null);
  const [editWorkerMenuOpen, setEditWorkerMenuOpen] = useState(false);
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});

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

  const [workerSearch, setWorkerSearch] = useState("");
  const [selectedWorker, setSelectedWorker] = useState<{ id: string; name: string } | null>(null);
  const [workerMenuOpen, setWorkerMenuOpen] = useState(false);

  // Query client for refetching
  const queryClient = useQueryClient();

  // Mutation for editing client
  const editClientMutation = api.client.editClient.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  // Fetch users with InterventionWorker role
  const {
    data: workers = [],
    isLoading: workersLoading,
  } = api.users.list.useQuery(undefined, {
    select: (users) =>
      users
        ? users
            .filter((u) => u.role === "InterventionTeam" || u.role === "Admin" )
            .map((u) => ({ id: u.supabaseId, name: u.name }))
        : [],
  });


  // fetch initial server data
  const {
    data: rawClients = [],
    isLoading,
    isError,
  } = api.client.listClients.useQuery();

  // Map Prisma clients to frontend Client type
  const fetchedClients: Client[] = React.useMemo(() => {
    return (rawClients || []).map((c: PrismaClient) => ({
      id: String(c.id),
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email || "",
      leaseStartDate: c.leaseStart ? new Date(c.leaseStart) : new Date(),
      leaseEndDate: c.leaseEnd ? new Date(c.leaseEnd) : new Date(),
      workerName: c.worker?.name || "",
    }));
  }, [rawClients]);

  const table = useReactTable<Client>({
    data: fetchedClients,
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

  // You may want to implement handleSave to call a mutation to add a client to the backend
  const handleSave = (saveAndAddMore: boolean) => {
    // TODO: Call backend mutation to add client
    // For now, just reset form
    resetForm();
    setIsAdding(false);
  };

  // Inline edit handlers
  const startEdit = (client: Client) => {
    setEditingId(client.id);
    setEditFormData({
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      leaseStart: client.leaseStartDate instanceof Date ? client.leaseStartDate.toISOString().slice(0, 10) : "",
      leaseEnd: client.leaseEndDate instanceof Date ? client.leaseEndDate.toISOString().slice(0, 10) : "",
    });
    setEditWorker(client.workerName ? workers.find(w => w.name === client.workerName) || null : null);
    setEditFormErrors({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFormData(null);
    setEditWorker(null);
    setEditFormErrors({});
  };

  const validateEditForm = (): boolean => {
    if (!editFormData) return false;
    const result = clientSchema.safeParse(editFormData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) errors[err.path[0] as string] = err.message;
      });
      setEditFormErrors(errors);
      return false;
    }
    setEditFormErrors({});
    return true;
  };

  // Implement saveEdit to call mutation
  const saveEdit = () => {
    if (!validateEditForm() || !editingId) return;
    const client = fetchedClients.find(c => c.id === editingId);
    if (!client) return;

    editClientMutation.mutate({
      id: Number(client.id),
      firstName: editFormData!.firstName,
      lastName: editFormData!.lastName,
      email: editFormData!.email,
      leaseStart: editFormData!.leaseStart ? new Date(editFormData!.leaseStart) : undefined,
      leaseEnd: editFormData!.leaseEnd ? new Date(editFormData!.leaseEnd) : undefined,
      workerId: editWorker ? editWorker.id : undefined,
      // Add other fields as needed
    });
    cancelEdit();
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
          onClick={() => exportToCSV(fetchedClients)}
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
                {/* Search an Intervention Team worker - default to self */}
                <TableCell>
                  <DropdownMenu open={workerMenuOpen} onOpenChange={setWorkerMenuOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start bg-white border-[#3FA9A9] text-black"
                        type="button"
                      >
                        {selectedWorker ? selectedWorker.name : "Select Intervention Worker"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-[220px]">
                      <div className="p-2">
                        <Input
                          placeholder="Search worker..."
                          value={workerSearch}
                          onChange={e => setWorkerSearch(e.target.value)}
                          className="mb-2 bg-white border-[#3FA9A9]"
                          autoFocus
                        />
                      </div>
                      {workersLoading ? (
                        <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
                      ) : workers.length === 0 ? (
                        <DropdownMenuItem disabled>No workers found</DropdownMenuItem>
                      ) : (
                        workers.map((worker: { id: string; name: string }) => (
                          <DropdownMenuItem
                            key={worker.id}
                            onClick={() => {
                              setSelectedWorker(worker);
                              setWorkerMenuOpen(false);
                            }}
                          >
                            {worker.name}
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
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
              ? table.getRowModel().rows.map((row) => {
                  const client = row.original;
                  const isEditing = editingId === client.id;
                  if (isEditing) {
                    return (
                      <TableRow key={row.id} className="bg-[#FFFBEA] hover:bg-[#FFFBEA]">
                        {/* First Name */}
                        <TableCell>
                          <Input
                            value={editFormData?.firstName || ""}
                            onChange={e => setEditFormData(f => ({ ...f!, firstName: e.target.value }))}
                            className={`bg-white border-[#3FA9A9] ${editFormErrors.firstName ? "border-red-500" : ""}`}
                          />
                          {editFormErrors.firstName && (
                            <p className="text-xs text-red-500 mt-1">{editFormErrors.firstName}</p>
                          )}
                        </TableCell>
                        {/* Last Name */}
                        <TableCell>
                          <Input
                            value={editFormData?.lastName || ""}
                            onChange={e => setEditFormData(f => ({ ...f!, lastName: e.target.value }))}
                            className={`bg-white border-[#3FA9A9] ${editFormErrors.lastName ? "border-red-500" : ""}`}
                          />
                          {editFormErrors.lastName && (
                            <p className="text-xs text-red-500 mt-1">{editFormErrors.lastName}</p>
                          )}
                        </TableCell>
                        {/* Email */}
                        <TableCell>
                          <Input
                            type="email"
                            value={editFormData?.email || ""}
                            onChange={e => setEditFormData(f => ({ ...f!, email: e.target.value }))}
                            className={`bg-white border-[#3FA9A9] ${editFormErrors.email ? "border-red-500" : ""}`}
                          />
                          {editFormErrors.email && (
                            <p className="text-xs text-red-500 mt-1">{editFormErrors.email}</p>
                          )}
                        </TableCell>
                        {/* Lease Start */}
                        <TableCell>
                          <Input
                            type="date"
                            value={editFormData?.leaseStart || ""}
                            onChange={e => setEditFormData(f => ({ ...f!, leaseStart: e.target.value }))}
                            className={`bg-white border-[#3FA9A9] ${editFormErrors.leaseStart ? "border-red-500" : ""}`}
                          />
                          {editFormErrors.leaseStart && (
                            <p className="text-xs text-red-500 mt-1">{editFormErrors.leaseStart}</p>
                          )}
                        </TableCell>
                        {/* Lease End */}
                        <TableCell>
                          <Input
                            type="date"
                            value={editFormData?.leaseEnd || ""}
                            onChange={e => setEditFormData(f => ({ ...f!, leaseEnd: e.target.value }))}
                            className={`bg-white border-[#3FA9A9] ${editFormErrors.leaseEnd ? "border-red-500" : ""}`}
                          />
                          {editFormErrors.leaseEnd && (
                            <p className="text-xs text-red-500 mt-1">{editFormErrors.leaseEnd}</p>
                          )}
                        </TableCell>
                        {/* Worker */}
                        <TableCell>
                          <DropdownMenu open={editWorkerMenuOpen} onOpenChange={setEditWorkerMenuOpen}>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start bg-white border-[#3FA9A9] text-black"
                                type="button"
                              >
                                {editWorker ? editWorker.name : "Select Intervention Worker"}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="min-w-[220px]">
                              <div className="p-2">
                                <Input
                                  placeholder="Search worker..."
                                  value={workerSearch}
                                  onChange={e => setWorkerSearch(e.target.value)}
                                  className="mb-2 bg-white border-[#3FA9A9]"
                                  autoFocus
                                />
                              </div>
                              {workersLoading ? (
                                <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
                              ) : workers.length === 0 ? (
                                <DropdownMenuItem disabled>No workers found</DropdownMenuItem>
                              ) : (
                                workers
                                  .filter((worker: { id: string; name: string }) =>
                                    worker.name.toLowerCase().includes(workerSearch.toLowerCase())
                                  )
                                  .map((worker: { id: string; name: string }) => (
                                    <DropdownMenuItem
                                      key={worker.id}
                                      onClick={() => {
                                        setEditWorker(worker);
                                        setEditWorkerMenuOpen(false);
                                      }}
                                    >
                                      {worker.name}
                                    </DropdownMenuItem>
                                  ))
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        {/* Actions */}
                        <TableCell>
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={cancelEdit}>
                              Cancel
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={saveEdit}
                              className="bg-[#45BAB8] text-white hover:bg-[#45BAB8]"
                            >
                              Save
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }
                  // Default (not editing)
                  return (
                    <TableRow key={row.id} className="hover:bg-transparent">
                      {row.getVisibleCells().map((cell, idx) => {
                        // Render edit button in the actions column
                        if (cell.column.id === "actions") {
                          return (
                            <TableCell key={cell.id}>
                              <div className="flex gap-2 items-center">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEdit(client)}
                                >
                                  Edit
                                </Button>
                              </div>
                            </TableCell>
                          );
                        }
                        return (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
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
