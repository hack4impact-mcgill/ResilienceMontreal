"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
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

import { Client, createColumns } from "./columns";
import { api } from "~/trpc/react";
import { z } from "zod";
import { toast } from "sonner";

// Validation schema (inline add row)
const clientSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.email("Invalid email"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  leaseStart: z.string().min(1, "Lease start date is required"),
  leaseEnd: z.string().min(1, "Lease end date is required"),
  workerId: z.string().min(1, "Intervention worker is required"),
});

type ClientFormData = z.infer<typeof clientSchema>;
type SortByField =
  | "firstName"
  | "lastName"
  | "createdAt"
  | "leaseEnd"
  | "workerId";

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
    "Date of Birth",
    "Intervention Worker",
    "Lease Start Date",
    "Lease End Date",
  ];
  // CSV rows
  const rows = clients.map((c) => [
    c.firstName,
    c.lastName,
    c.email,
    c.dateOfBirth ? c.dateOfBirth.toLocaleDateString() : "",
    c.workerName,
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
  const [filterMenuOpen, setFilterMenuOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(10);
  const [sortBy, setSortBy] = React.useState<SortByField>("createdAt");

  const [isAdding, setIsAdding] = React.useState(false);
  const [formData, setFormData] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    dateOfBirth: "",
    leaseStart: "",
    leaseEnd: "",
    workerId: "",
  });
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>(
    {},
  );

  // Edit state
  const [editingRowId, setEditingRowId] = React.useState<number | null>(null);
  const [editFormData, setEditFormData] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    dateOfBirth: "",
    leaseStart: "",
    leaseEnd: "",
    workerId: "",
  });
  const [editFormErrors, setEditFormErrors] = React.useState<
    Record<string, string>
  >({});

  const utils = api.useUtils();

  const {
    data: pagedClients,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = api.clients.getClients.useQuery(
    {
      page,
      limit,
      sortBy,
      sortOrder: "desc",
      search: search.trim() || undefined,
    },
    {
      placeholderData: (previous) => previous,
    },
  );

  const mappedClients = React.useMemo(
    () =>
      (pagedClients?.data ?? []).map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email ?? "",
        dateOfBirth: c.dateOfBirth ? new Date(c.dateOfBirth) : null,
        leaseStartDate: c.leaseStart ? new Date(c.leaseStart) : new Date(0),
        leaseEndDate: c.leaseEnd ? new Date(c.leaseEnd) : new Date(0),
        workerName: c.worker?.name ?? "",
        workerId: c.worker?.supabaseId ?? "",
      })),
    [pagedClients],
  );

  const metadata = pagedClients?.metadata;

  const prettyLabel = (col: string) => {
    if (col === "firstName") return "First Name";
    if (col === "lastName") return "Last Name";
    if (col === "email") return "Email";
    if (col === "createdAt") return "Created At";
    if (col === "leaseEnd") return "Lease End";
    if (col === "workerId") return "Worker";
    return col;
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      dateOfBirth: "",
      leaseStart: "",
      leaseEnd: "",
      workerId: "",
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

  const { data: users, isLoading: isLoadingUsers } = api.users.list.useQuery();
  const workers = React.useMemo(
    () =>
      (users ?? []).filter(
        (u: any) => u.role === "InterventionTeam" || u.role === "Admin",
      ),
    [users],
  );

  const addClient = api.clients.addClient.useMutation();
  const editClient = api.clients.editClient.useMutation();
  const deleteClient = api.clients.deleteClient.useMutation();

  const handleSave = (saveAndAddMore: boolean) => {
    if (!validateForm()) return;
    addClient.mutate(
      {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        dateOfBirth: new Date(formData.dateOfBirth),
        leaseStart: new Date(formData.leaseStart),
        leaseEnd: new Date(formData.leaseEnd),
        workerId: formData.workerId,
      },
      {
        onSuccess: () => {
          void utils.clients.getClients.invalidate();
          refetch?.();
          resetForm();
          if (!saveAndAddMore) {
            setIsAdding(false);
          }
          toast.success("Client added successfully!");
        },
        onError: (error) => {
          console.error("Error adding client:", error);
          toast.error(
            error.message || "Failed to add client. Please try again.",
          );
        },
      },
    );
  };

  const handleCancel = () => {
    resetForm();
    setIsAdding(false);
  };

  const startEdit = (client: Client) => {
    if (isAdding) return;
    setEditingRowId(client.id);
    setEditFormData({
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      dateOfBirth: client.dateOfBirth
        ? new Date(client.dateOfBirth).toISOString().split("T")[0]
        : "",
      leaseStart: client.leaseStartDate
        ? new Date(client.leaseStartDate).toISOString().split("T")[0]
        : "",
      leaseEnd: client.leaseEndDate
        ? new Date(client.leaseEndDate).toISOString().split("T")[0]
        : "",
      workerId: client.workerId,
    });
    setEditFormErrors({});
  };

  const cancelEdit = () => {
    setEditingRowId(null);
    setEditFormData({
      firstName: "",
      lastName: "",
      email: "",
      dateOfBirth: "",
      leaseStart: "",
      leaseEnd: "",
      workerId: "",
    });
    setEditFormErrors({});
  };

  const validateEditForm = (): boolean => {
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

  const handleEditSave = () => {
    if (!validateEditForm() || editingRowId === null) return;
    editClient.mutate(
      {
        id: editingRowId,
        firstName: editFormData.firstName,
        lastName: editFormData.lastName,
        email: editFormData.email,
        dateOfBirth: new Date(editFormData.dateOfBirth),
        leaseStart: new Date(editFormData.leaseStart),
        leaseEnd: new Date(editFormData.leaseEnd),
        workerId: editFormData.workerId,
      },
      {
        onSuccess: () => {
          void utils.clients.getClients.invalidate();
          refetch?.();
          cancelEdit();
          toast.success("Client updated successfully!");
        },
        onError: (error) => {
          console.error("Error updating client:", error);
          toast.error(
            error.message || "Failed to update client. Please try again.",
          );
        },
      },
    );
  };

  const handleDelete = (clientId: number) => {
    if (
      window.confirm(
        "Are you sure you want to delete this client? This action cannot be undone.",
      )
    ) {
      deleteClient.mutate(
        { id: clientId },
        {
          onSuccess: () => {
            void utils.clients.getClients.invalidate();
            refetch?.();
            toast.success("Client deleted successfully!");
          },
          onError: (error) => {
            console.error("Error deleting client:", error);
            toast.error(
              error.message || "Failed to delete client. Please try again.",
            );
          },
        },
      );
    }
  };

  const columns = React.useMemo(
    () => createColumns(startEdit, handleDelete),
    [],
  );

  const table = useReactTable<Client>({
    data: mappedClients,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) return <div>Loading...</div>;
  if (isError)
    return <div className="p-6 text-red-600">Error loading clients.</div>;

  type FilterColumn = "firstName" | "lastName" | "email";
  return (
    <div className="w-full">
      {/* Filter Row */}
      <div className="border-border -mx-8 px-8 flex items-center py-4">
        {/* Search Input */}
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
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
            {(
              [
                "createdAt",
                "firstName",
                "lastName",
                "leaseEnd",
                "workerId",
              ] as const
            ).map((col) => (
              <DropdownMenuItem
                key={col}
                onClick={() => {
                  setSortBy(col);
                  setPage(1);
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
          onClick={() => exportToCSV(mappedClients)}
        >
          Export
        </Button>

        {/* Add Client Button */}
        <Button
          variant="outline"
          className="bg-[#45BAB8] text-white hover:bg-[#45BAB8]"
          onClick={() => setIsAdding(true)}
          disabled={editingRowId !== null}
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
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      setFormData({ ...formData, dateOfBirth: e.target.value })
                    }
                    placeholder="Date of Birth"
                    className={`bg-white border-[#3FA9A9] ${formErrors.dateOfBirth ? "border-red-500" : ""}`}
                  />
                  {formErrors.dateOfBirth && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.dateOfBirth}
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
                  {/* Intervention Worker Dropdown */}
                  <select
                    value={formData.workerId}
                    onChange={(e) =>
                      setFormData({ ...formData, workerId: e.target.value })
                    }
                    className={`bg-white border-[#3FA9A9] px-2 py-1 rounded ${formErrors.workerId ? "border-red-500" : ""}`}
                    disabled={isLoadingUsers}
                  >
                    <option value="">Select Worker</option>
                    {workers.map((w: any) => (
                      <option key={w.supabaseId} value={w.supabaseId}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.workerId && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.workerId}
                    </p>
                  )}
                </TableCell>
                <TableCell>{/* Empty cell for actions column */}</TableCell>
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
                      disabled={addClient.isPending}
                    >
                      {addClient.isPending ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSave(true)}
                      className="bg-[#45BAB8] text-white hover:bg-[#45BAB8]"
                      disabled={addClient.isPending}
                    >
                      {addClient.isPending ? "Saving..." : "Save & Add More"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {table.getRowModel().rows.length > 0
              ? table.getRowModel().rows.map((row) => (
                  <React.Fragment key={row.id}>
                    {editingRowId === row.original.id ? (
                      <>
                        {/* Edit Form Row */}
                        <TableRow className="bg-[#D1EDED] hover:bg-[#D1EDED]">
                          <TableCell>
                            <Input
                              value={editFormData.firstName}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  firstName: e.target.value,
                                })
                              }
                              placeholder="First Name"
                              className={`bg-white border-[#3FA9A9] ${editFormErrors.firstName ? "border-red-500" : ""}`}
                            />
                            {editFormErrors.firstName && (
                              <p className="text-xs text-red-500 mt-1">
                                {editFormErrors.firstName}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              value={editFormData.lastName}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  lastName: e.target.value,
                                })
                              }
                              placeholder="Last Name"
                              className={`bg-white border-[#3FA9A9] ${editFormErrors.lastName ? "border-red-500" : ""}`}
                            />
                            {editFormErrors.lastName && (
                              <p className="text-xs text-red-500 mt-1">
                                {editFormErrors.lastName}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="email"
                              value={editFormData.email}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  email: e.target.value,
                                })
                              }
                              placeholder="Email"
                              className={`bg-white border-[#3FA9A9] ${editFormErrors.email ? "border-red-500" : ""}`}
                            />
                            {editFormErrors.email && (
                              <p className="text-xs text-red-500 mt-1">
                                {editFormErrors.email}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              value={editFormData.dateOfBirth}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  dateOfBirth: e.target.value,
                                })
                              }
                              placeholder="Date of Birth"
                              className={`bg-white border-[#3FA9A9] ${editFormErrors.dateOfBirth ? "border-red-500" : ""}`}
                            />
                            {editFormErrors.dateOfBirth && (
                              <p className="text-xs text-red-500 mt-1">
                                {editFormErrors.dateOfBirth}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              value={editFormData.leaseStart}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  leaseStart: e.target.value,
                                })
                              }
                              className={`bg-white border-[#3FA9A9] ${editFormErrors.leaseStart ? "border-red-500" : ""}`}
                            />
                            {editFormErrors.leaseStart && (
                              <p className="text-xs text-red-500 mt-1">
                                {editFormErrors.leaseStart}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              value={editFormData.leaseEnd}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  leaseEnd: e.target.value,
                                })
                              }
                              className={`bg-white border-[#3FA9A9] ${editFormErrors.leaseEnd ? "border-red-500" : ""}`}
                            />
                            {editFormErrors.leaseEnd && (
                              <p className="text-xs text-red-500 mt-1">
                                {editFormErrors.leaseEnd}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            {/* Intervention Worker Dropdown */}
                            <select
                              value={editFormData.workerId}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  workerId: e.target.value,
                                })
                              }
                              className={`bg-white border-[#3FA9A9] px-2 py-1 rounded ${editFormErrors.workerId ? "border-red-500" : ""}`}
                              disabled={isLoadingUsers}
                            >
                              <option value="">Select Worker</option>
                              {workers.map((w: any) => (
                                <option key={w.supabaseId} value={w.supabaseId}>
                                  {w.name}
                                </option>
                              ))}
                            </select>
                            {editFormErrors.workerId && (
                              <p className="text-xs text-red-500 mt-1">
                                {editFormErrors.workerId}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            {/* Empty cell for actions column */}
                          </TableCell>
                        </TableRow>
                        {/* Edit Buttons Row */}
                        <TableRow className="bg-[#D1EDED] hover:bg-[#D1EDED]">
                          <TableCell
                            colSpan={columns.length}
                            className="py-4 px-20"
                          >
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={cancelEdit}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleEditSave}
                                className="bg-[#45BAB8] text-white hover:bg-[#45BAB8]"
                                disabled={editClient.isPending}
                              >
                                {editClient.isPending ? "Saving..." : "Save"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      </>
                    ) : (
                      <TableRow className="hover:bg-transparent">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    )}
                  </React.Fragment>
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
      <div className="flex items-center justify-between space-x-2 py-4 px-8">
        <div className="text-sm text-muted-foreground">
          {metadata
            ? `Page ${metadata.page} of ${metadata.totalPages} • ${metadata.total} total clients`
            : ""}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={
              !metadata?.hasPrevPage ||
              editingRowId !== null ||
              isAdding ||
              isRefetching
            }
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => prev + 1)}
            disabled={
              !metadata?.hasNextPage ||
              editingRowId !== null ||
              isAdding ||
              isRefetching
            }
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};
