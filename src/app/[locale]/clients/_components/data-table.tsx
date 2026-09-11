"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { CirclePlus, Search } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

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

import { Client, createColumns } from "./columns";
import { api, type RouterOutputs } from "~/trpc/react";

import { useServerTableState } from "@/hooks/use-server-table-state";
import { useAdvancedFilters } from "@/hooks/use-advanced-filters";
import { useTableForm } from "@/hooks/use-table-form";
import { exportToCSV } from "@/lib/data-table/export-csv";
import { FetchingOverlay } from "@/components/data-table/FetchingOverlay";
import { TableEmptyRow } from "@/components/data-table/TableEmptyRow";
import { TablePagination } from "@/components/data-table/TablePagination";
import { TableSortControls } from "@/components/data-table/TableSortControls";
import { AdvancedFilterPopover } from "@/components/data-table/AdvancedFilterPopover";
import { DeleteConfirmDialog } from "@/components/data-table/DeleteConfirmDialog";
import { InlineFormRow } from "@/components/data-table/InlineFormRow";

type ClientSortBy = "firstName" | "lastName" | "createdAt" | "leaseEnd" | "workerId";
type ListedUser = RouterOutputs["users"]["list"][number];

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

const SORT_FIELDS = [
  { value: "createdAt" as const, label: "Date created" },
  { value: "firstName" as const, label: "First name" },
  { value: "lastName" as const, label: "Last name" },
  { value: "leaseEnd" as const, label: "Lease end date" },
  { value: "workerId" as const, label: "Worker" },
];

const EMPTY_FILTERS = { leaseFrom: "", leaseTo: "", workerId: "" };
const EMPTY_FORM: ClientFormData = {
  firstName: "",
  lastName: "",
  email: "",
  dateOfBirth: "",
  leaseStart: "",
  leaseEnd: "",
  workerId: "",
};

export const ClientsTable = () => {
  const tableState = useServerTableState<ClientSortBy>({ defaultSortBy: "createdAt" });
  const filters = useAdvancedFilters(EMPTY_FILTERS);
  const form = useTableForm<ClientFormData>(EMPTY_FORM);

  const [editingRowId, setEditingRowId] = React.useState<number | null>(null);
  const [editFormData, setEditFormDataRaw] = React.useState<ClientFormData>(EMPTY_FORM);
  const [editFormErrors, setEditFormErrors] = React.useState<Record<string, string>>({});
  const [deleteTargetId, setDeleteTargetId] = React.useState<number | null>(null);

  const setEditFormData = (update: Partial<ClientFormData>) =>
    setEditFormDataRaw((prev) => ({ ...prev, ...update }));

  const utils = api.useUtils();

  const { data: pagedClients, isLoading, isError, isRefetching, isFetching } =
    api.clients.getClients.useQuery(
      {
        page: tableState.page,
        limit: tableState.limit,
        sortBy: tableState.sortBy,
        sortOrder: tableState.sortOrder,
        search: tableState.appliedSearch?.trim() || undefined,
        workerId: filters.applied.workerId || undefined,
        dateFrom: filters.applied.leaseFrom
          ? new Date(`${filters.applied.leaseFrom}T12:00:00`)
          : undefined,
        dateTo: filters.applied.leaseTo
          ? new Date(`${filters.applied.leaseTo}T12:00:00`)
          : undefined,
      },
      { placeholderData: (previous) => previous },
    );

  const pagination = pagedClients?.pagination;

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

  const { data: users, isLoading: isLoadingUsers } = api.users.list.useQuery();
  const workers = React.useMemo(
    () =>
      (users ?? []).filter(
        (u: ListedUser) => u.role === "InterventionTeam" || u.role === "Admin",
      ),
    [users],
  );

  const addClient = api.clients.addClient.useMutation();
  const editClient = api.clients.editClient.useMutation();
  const deleteClient = api.clients.deleteClient.useMutation();

  const handleSave = (saveAndAddMore: boolean) => {
    if (!form.validateForm(clientSchema)) return;
    addClient.mutate(
      {
        firstName: form.formData.firstName,
        lastName: form.formData.lastName,
        email: form.formData.email,
        dateOfBirth: new Date(form.formData.dateOfBirth),
        leaseStart: new Date(form.formData.leaseStart),
        leaseEnd: new Date(form.formData.leaseEnd),
        workerId: form.formData.workerId,
      },
      {
        onSuccess: () => {
          void utils.clients.getClients.invalidate();
          form.resetForm();
          if (!saveAndAddMore) form.closeForm();
          toast.success("Client added successfully!");
        },
        onError: (error) => {
          toast.error(error.message || "Failed to add client. Please try again.");
        },
      },
    );
  };

  const startEdit = (client: Client) => {
    if (form.isAdding) return;
    setEditingRowId(client.id);
    setEditFormDataRaw({
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      dateOfBirth: client.dateOfBirth
        ? new Date(client.dateOfBirth).toISOString().split("T")[0]!
        : "",
      leaseStart: client.leaseStartDate
        ? new Date(client.leaseStartDate).toISOString().split("T")[0]!
        : "",
      leaseEnd: client.leaseEndDate
        ? new Date(client.leaseEndDate).toISOString().split("T")[0]!
        : "",
      workerId: client.workerId,
    });
    setEditFormErrors({});
  };

  const cancelEdit = () => {
    setEditingRowId(null);
    setEditFormDataRaw(EMPTY_FORM);
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
          cancelEdit();
          toast.success("Client updated successfully!");
        },
        onError: (error) => {
          toast.error(error.message || "Failed to update client. Please try again.");
        },
      },
    );
  };

  const confirmDelete = () => {
    if (deleteTargetId === null) return;
    deleteClient.mutate(
      { id: deleteTargetId },
      {
        onSuccess: () => {
          void utils.clients.getClients.invalidate();
          toast.success("Client deleted successfully!");
        },
        onError: (error) => {
          toast.error(error.message || "Failed to delete client. Please try again.");
        },
        onSettled: () => setDeleteTargetId(null),
      },
    );
  };

  const columns = React.useMemo(
    () => createColumns(startEdit, (id) => setDeleteTargetId(id)),
    [],
  );

  const table = useReactTable<Client>({
    data: mappedClients,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) return <div>Loading…</div>;
  if (isError) return <div className="p-6 text-red-600">Error loading clients.</div>;

  const hasDraft = Boolean(
    filters.draft.leaseFrom || filters.draft.leaseTo || filters.draft.workerId,
  );

  const WorkerSelect = ({ value, onChange, disabled }: {
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
  }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-white border-[#3FA9A9] px-2 py-1 rounded"
      disabled={disabled ?? isLoadingUsers}
    >
      <option value="">Select Worker</option>
      {workers.map((w: ListedUser) => (
        <option key={w.supabaseId} value={w.supabaseId}>
          {w.name}
        </option>
      ))}
    </select>
  );

  return (
    <div className="relative w-full">
      {isFetching && <FetchingOverlay />}

      <DeleteConfirmDialog
        open={deleteTargetId !== null}
        entityName="this client"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />

      <div className="border-border -mx-8 px-8 flex flex-col gap-3 py-4">
        {/* Search row */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[240px] max-w-md flex-1 flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="client-search">
              Search (name / email)
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="client-search"
                placeholder="Search by name or email…"
                value={tableState.draftSearch}
                onChange={(e) => tableState.setDraftSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    tableState.commitSearch();
                  }
                }}
                className="w-80 max-w-full bg-white border-[#3FA9A9]"
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
              <Button
                variant="ghost"
                className="text-black hover:bg-transparent"
                onClick={() => {
                  tableState.clearSearch();
                  filters.clear();
                }}
              >
                Clear
              </Button>
              <AdvancedFilterPopover
                description="Filter by lease end date range or intervention worker."
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
                    <label className="text-xs text-muted-foreground" htmlFor="client-lease-from">
                      Lease end from
                    </label>
                    <Input
                      id="client-lease-from"
                      type="date"
                      className="w-full min-w-0"
                      value={filters.draft.leaseFrom}
                      onChange={(e) => filters.setDraft({ leaseFrom: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground" htmlFor="client-lease-to">
                      Lease end to
                    </label>
                    <Input
                      id="client-lease-to"
                      type="date"
                      className="w-full min-w-0"
                      value={filters.draft.leaseTo}
                      onChange={(e) => filters.setDraft({ leaseTo: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground" htmlFor="client-worker-filter">
                    Intervention worker
                  </label>
                  <select
                    id="client-worker-filter"
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={filters.draft.workerId}
                    onChange={(e) => filters.setDraft({ workerId: e.target.value })}
                    disabled={isLoadingUsers}
                  >
                    <option value="">All workers</option>
                    {workers.map((w: ListedUser) => (
                      <option key={w.supabaseId} value={w.supabaseId}>
                        {w.name}
                      </option>
                    ))}
                  </select>
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
            onClick={() =>
              exportToCSV(
                ["First Name", "Last Name", "Email", "Date of Birth", "Intervention Worker", "Lease Start Date", "Lease End Date"],
                mappedClients.map((c) => [
                  c.firstName,
                  c.lastName,
                  c.email,
                  c.dateOfBirth ? c.dateOfBirth.toLocaleDateString() : "",
                  c.workerName,
                  c.leaseStartDate.toLocaleDateString(),
                  c.leaseEndDate.toLocaleDateString(),
                ]),
                "client_list",
              )
            }
          >
            Export
          </Button>

          <Button
            variant="outline"
            className="bg-[#45BAB8] text-white hover:bg-[#45BAB8]"
            onClick={form.openForm}
            disabled={editingRowId !== null}
          >
            <CirclePlus /> Add Client
          </Button>
        </div>
      </div>

      <div className="-mx-8">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {/* Inline add form */}
            {form.isAdding && (
              <InlineFormRow
                colCount={columns.length}
                onSave={() => handleSave(false)}
                onSaveAndAddMore={() => handleSave(true)}
                onCancel={form.closeForm}
                isSaving={addClient.isPending}
              >
                <TableCell>
                  <Input value={form.formData.firstName}
                    onChange={(e) => form.setFormData({ firstName: e.target.value })}
                    placeholder="First Name"
                    className={`bg-white border-[#3FA9A9] ${form.formErrors.firstName ? "border-red-500" : ""}`} />
                  {form.formErrors.firstName && <p className="text-xs text-red-500 mt-1">{form.formErrors.firstName}</p>}
                </TableCell>
                <TableCell>
                  <Input value={form.formData.lastName}
                    onChange={(e) => form.setFormData({ lastName: e.target.value })}
                    placeholder="Last Name"
                    className={`bg-white border-[#3FA9A9] ${form.formErrors.lastName ? "border-red-500" : ""}`} />
                  {form.formErrors.lastName && <p className="text-xs text-red-500 mt-1">{form.formErrors.lastName}</p>}
                </TableCell>
                <TableCell>
                  <Input type="email" value={form.formData.email}
                    onChange={(e) => form.setFormData({ email: e.target.value })}
                    placeholder="Email"
                    className={`bg-white border-[#3FA9A9] ${form.formErrors.email ? "border-red-500" : ""}`} />
                  {form.formErrors.email && <p className="text-xs text-red-500 mt-1">{form.formErrors.email}</p>}
                </TableCell>
                <TableCell>
                  <Input type="date" value={form.formData.dateOfBirth}
                    onChange={(e) => form.setFormData({ dateOfBirth: e.target.value })}
                    className={`bg-white border-[#3FA9A9] ${form.formErrors.dateOfBirth ? "border-red-500" : ""}`} />
                  {form.formErrors.dateOfBirth && <p className="text-xs text-red-500 mt-1">{form.formErrors.dateOfBirth}</p>}
                </TableCell>
                <TableCell>
                  <Input type="date" value={form.formData.leaseStart}
                    onChange={(e) => form.setFormData({ leaseStart: e.target.value })}
                    className={`bg-white border-[#3FA9A9] ${form.formErrors.leaseStart ? "border-red-500" : ""}`} />
                  {form.formErrors.leaseStart && <p className="text-xs text-red-500 mt-1">{form.formErrors.leaseStart}</p>}
                </TableCell>
                <TableCell>
                  <Input type="date" value={form.formData.leaseEnd}
                    onChange={(e) => form.setFormData({ leaseEnd: e.target.value })}
                    className={`bg-white border-[#3FA9A9] ${form.formErrors.leaseEnd ? "border-red-500" : ""}`} />
                  {form.formErrors.leaseEnd && <p className="text-xs text-red-500 mt-1">{form.formErrors.leaseEnd}</p>}
                </TableCell>
                <TableCell>
                  <WorkerSelect value={form.formData.workerId} onChange={(v) => form.setFormData({ workerId: v })} />
                  {form.formErrors.workerId && <p className="text-xs text-red-500 mt-1">{form.formErrors.workerId}</p>}
                </TableCell>
                <TableCell />
              </InlineFormRow>
            )}

            {table.getRowModel().rows.length > 0
              ? table.getRowModel().rows.map((row) => (
                  <React.Fragment key={row.id}>
                    {editingRowId === row.original.id ? (
                      <InlineFormRow
                        colCount={columns.length}
                        onSave={handleEditSave}
                        onCancel={cancelEdit}
                        isSaving={editClient.isPending}
                      >
                        <TableCell>
                          <Input value={editFormData.firstName}
                            onChange={(e) => setEditFormData({ firstName: e.target.value })}
                            placeholder="First Name"
                            className={`bg-white border-[#3FA9A9] ${editFormErrors.firstName ? "border-red-500" : ""}`} />
                          {editFormErrors.firstName && <p className="text-xs text-red-500 mt-1">{editFormErrors.firstName}</p>}
                        </TableCell>
                        <TableCell>
                          <Input value={editFormData.lastName}
                            onChange={(e) => setEditFormData({ lastName: e.target.value })}
                            placeholder="Last Name"
                            className={`bg-white border-[#3FA9A9] ${editFormErrors.lastName ? "border-red-500" : ""}`} />
                          {editFormErrors.lastName && <p className="text-xs text-red-500 mt-1">{editFormErrors.lastName}</p>}
                        </TableCell>
                        <TableCell>
                          <Input type="email" value={editFormData.email}
                            onChange={(e) => setEditFormData({ email: e.target.value })}
                            placeholder="Email"
                            className={`bg-white border-[#3FA9A9] ${editFormErrors.email ? "border-red-500" : ""}`} />
                          {editFormErrors.email && <p className="text-xs text-red-500 mt-1">{editFormErrors.email}</p>}
                        </TableCell>
                        <TableCell>
                          <Input type="date" value={editFormData.dateOfBirth}
                            onChange={(e) => setEditFormData({ dateOfBirth: e.target.value })}
                            className={`bg-white border-[#3FA9A9] ${editFormErrors.dateOfBirth ? "border-red-500" : ""}`} />
                          {editFormErrors.dateOfBirth && <p className="text-xs text-red-500 mt-1">{editFormErrors.dateOfBirth}</p>}
                        </TableCell>
                        <TableCell>
                          <Input type="date" value={editFormData.leaseStart}
                            onChange={(e) => setEditFormData({ leaseStart: e.target.value })}
                            className={`bg-white border-[#3FA9A9] ${editFormErrors.leaseStart ? "border-red-500" : ""}`} />
                          {editFormErrors.leaseStart && <p className="text-xs text-red-500 mt-1">{editFormErrors.leaseStart}</p>}
                        </TableCell>
                        <TableCell>
                          <Input type="date" value={editFormData.leaseEnd}
                            onChange={(e) => setEditFormData({ leaseEnd: e.target.value })}
                            className={`bg-white border-[#3FA9A9] ${editFormErrors.leaseEnd ? "border-red-500" : ""}`} />
                          {editFormErrors.leaseEnd && <p className="text-xs text-red-500 mt-1">{editFormErrors.leaseEnd}</p>}
                        </TableCell>
                        <TableCell>
                          <WorkerSelect value={editFormData.workerId} onChange={(v) => setEditFormData({ workerId: v })} />
                          {editFormErrors.workerId && <p className="text-xs text-red-500 mt-1">{editFormErrors.workerId}</p>}
                        </TableCell>
                        <TableCell />
                      </InlineFormRow>
                    ) : (
                      <TableRow className="hover:bg-transparent">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    )}
                  </React.Fragment>
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
        disabled={editingRowId !== null || form.isAdding || isRefetching}
      />
    </div>
  );
};
