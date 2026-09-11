"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { CirclePlus, MoreHorizontal, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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

import { columns, Grant } from "./columns";
import { api, type RouterInputs, type RouterOutputs } from "@/trpc/react";

import { useServerTableState } from "@/hooks/use-server-table-state";
import { useAdvancedFilters } from "@/hooks/use-advanced-filters";
import { exportToCSV } from "@/lib/data-table/export-csv";
import { FetchingOverlay } from "@/components/data-table/FetchingOverlay";
import { TableEmptyRow } from "@/components/data-table/TableEmptyRow";
import { TablePagination } from "@/components/data-table/TablePagination";
import { TableSortControls } from "@/components/data-table/TableSortControls";
import { AdvancedFilterPopover } from "@/components/data-table/AdvancedFilterPopover";
import { InlineFormRow } from "@/components/data-table/InlineFormRow";

type GrantSortBy = "totalAmount" | "endDate" | "createdAt" | "title";
type FundPool = RouterOutputs["fundPool"]["getAll"][number];
type DbGrant = RouterOutputs["grant"]["getGrants"]["grants"][number];
type UpdateGrantPayload = RouterInputs["grant"]["update"];

function isGrantExpired(toBeUsedBy: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(toBeUsedBy);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

function mapDbGrant(g: DbGrant): Grant {
  let meta: Record<string, unknown> = {};
  try {
    meta = g.description ? JSON.parse(g.description) : {};
  } catch {
    meta = { notes: g.description };
  }
  const toBeUsedBy = meta.toBeUsedBy
    ? new Date(meta.toBeUsedBy as string | number | Date)
    : new Date(g.endDate || g.createdAt);
  const distributions = g.distributions ?? [];
  const originalAmount = distributions.length
    ? distributions.reduce(
        (sum: number, d: { amount: { toString(): string } }) =>
          sum + Number(d.amount?.toString?.() ?? d.amount ?? 0),
        0,
      )
    : Number(g.totalAmount?.toString?.() ?? g.totalAmount ?? 0);
  const spentAmount = distributions.reduce(
    (sum: number, d: { spentAmount: { toString(): string } }) =>
      sum + Number(d.spentAmount?.toString?.() ?? d.spentAmount ?? 0),
    0,
  );
  return {
    id: String(g.id),
    dbId: g.id,
    fundPoolId: g.distributions?.[0]?.fundPool?.id ?? undefined,
    organization: g.title,
    category: String(meta.category ?? ""),
    dateReceived: meta.dateReceived
      ? new Date(meta.dateReceived as string | number | Date)
      : new Date(g.createdAt),
    toBeUsedBy,
    email: String(meta.email ?? ""),
    phoneNumber: String(meta.phoneNumber ?? ""),
    notes: String(meta.notes ?? ""),
    originalAmount,
    spentAmount,
    remainingAmount: originalAmount - spentAmount,
  };
}

const SORT_FIELDS = [
  { value: "createdAt" as const, label: "Date created" },
  { value: "endDate" as const, label: "Due date" },
  { value: "totalAmount" as const, label: "Amount" },
  { value: "title" as const, label: "Organization (A–Z)" },
];

const EMPTY_FILTERS = { minAmount: "", maxAmount: "", dueFrom: "", dueTo: "" };

export const GrantsTable = () => {
  const tableState = useServerTableState<GrantSortBy>({ defaultSortBy: "createdAt" });
  const filters = useAdvancedFilters(EMPTY_FILTERS);

  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [addModalError, setAddModalError] = React.useState<string | null>(null);
  const [rowErrors, setRowErrors] = React.useState<Record<string, string>>({});
  const [editing, setEditing] = React.useState<{
    rowId: string;
    columnId: string;
    value: unknown;
  } | null>(null);

  // Inline add form state
  const [orgField, setOrgField] = React.useState("");
  const [categoryField, setCategoryField] = React.useState("");
  const [dateReceivedField, setDateReceivedField] = React.useState("");
  const [toBeUsedByField, setToBeUsedByField] = React.useState("");
  const [emailField, setEmailField] = React.useState("");
  const [phoneField, setPhoneField] = React.useState("");
  const [notesField, setNotesField] = React.useState("");
  const [amountField, setAmountField] = React.useState("");
  const [selectedPoolId, setSelectedPoolId] = React.useState<number | undefined>(undefined);

  const resetInlineForm = () => {
    setOrgField(""); setCategoryField(""); setDateReceivedField("");
    setToBeUsedByField(""); setEmailField(""); setPhoneField("");
    setNotesField(""); setAmountField(""); setSelectedPoolId(undefined);
  };

  // Reset page when filters/sort change
  React.useEffect(() => {
    tableState.setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.applied.minAmount,
    filters.applied.maxAmount,
    filters.applied.dueFrom,
    filters.applied.dueTo,
    tableState.sortBy,
    tableState.sortOrder,
    tableState.limit,
  ]);

  const queryInput = React.useMemo(() => {
    const minRaw = filters.applied.minAmount.trim();
    const maxRaw = filters.applied.maxAmount.trim();
    const minN = minRaw === "" ? NaN : Number(minRaw);
    const maxN = maxRaw === "" ? NaN : Number(maxRaw);
    return {
      page: tableState.page,
      limit: tableState.limit,
      sortBy: tableState.sortBy,
      sortOrder: tableState.sortOrder,
      title: tableState.appliedSearch || undefined,
      minAmount: Number.isFinite(minN) && minN > 0 ? minN : undefined,
      maxAmount: Number.isFinite(maxN) && maxN > 0 ? maxN : undefined,
      startDate: filters.applied.dueFrom
        ? new Date(`${filters.applied.dueFrom}T12:00:00`)
        : undefined,
      endDate: filters.applied.dueTo
        ? new Date(`${filters.applied.dueTo}T12:00:00`)
        : undefined,
    };
  }, [tableState.page, tableState.limit, tableState.sortBy, tableState.sortOrder, tableState.appliedSearch, filters.applied]);

  const utils = api.useContext();
  const { data: session } = api.auth.getSession.useQuery();

  const { data: grantListResult, isLoading, isError, isFetching } =
    api.grant.getGrants.useQuery(queryInput, {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 60_000,
    });

  const pagination = grantListResult?.pagination;
  const dbGrants = grantListResult?.grants;

  React.useEffect(() => {
    if (!pagination || pagination.totalPages <= 0) return;
    if (tableState.page > pagination.totalPages) tableState.setPage(pagination.totalPages);
  }, [pagination, tableState.page]);

  const { data: fundPools } = api.fundPool.getAll.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Seed default pool when add form opens
  React.useEffect(() => {
    if (addModalOpen && fundPools && fundPools.length > 0 && selectedPoolId === undefined) {
      setSelectedPoolId(fundPools[0].id);
      setCategoryField(fundPools[0].category ?? "");
    }
  }, [addModalOpen, fundPools]);

  const localGrants = React.useMemo(
    () => (dbGrants ?? []).map(mapDbGrant),
    [dbGrants],
  );

  const invalidateAll = async () => {
    await Promise.all([
      utils.grant.getGrants.invalidate(),
      utils.fundPool.getAll.invalidate(),
      utils.fundPool.getTotalFunding.invalidate(),
    ]);
  };

  const createMutation = api.grant.create.useMutation({
    onSuccess: async () => { await invalidateAll(); },
    onError: (err) => setAddModalError(err.message ?? "Error creating grant"),
  });

  const updateMutation = api.grant.update.useMutation({
    onSuccess: async () => { await invalidateAll(); },
    onError: (err, _vars, _ctx) => {
      // Invalidate to restore server state on update failure
      void utils.grant.getGrants.invalidate();
      setRowErrors((s) => ({
        ...s,
        [String(_vars.id)]: err?.message ?? "Failed to save",
      }));
    },
  });

  const deleteMutation = api.grant.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.grant.getGrants.cancel(queryInput);
      const snapshot = utils.grant.getGrants.getData(queryInput);
      utils.grant.getGrants.setData(queryInput, (old) =>
        old ? { ...old, grants: old.grants.filter((g) => g.id !== id) } : old,
      );
      return { snapshot };
    },
    onError: (_err, _vars, context) => {
      if (context?.snapshot) {
        utils.grant.getGrants.setData(queryInput, context.snapshot);
      }
    },
    onSettled: async () => {
      await Promise.all([
        utils.grant.getGrants.invalidate(),
        utils.fundPool.getAll.invalidate(),
        utils.fundPool.getTotalFunding.invalidate(),
        utils.fundPool.getUncategorized.invalidate(),
      ]);
    },
  });

  const table = useReactTable<Grant>({
    data: localGrants,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading && !grantListResult) return <div>Loading…</div>;
  if (isError) return <div className="text-destructive">Could not load grants. Please try again.</div>;

  const hasDraft = Boolean(
    filters.draft.minAmount.trim() || filters.draft.maxAmount.trim() ||
    filters.draft.dueFrom || filters.draft.dueTo,
  );

  const editableColumns = [
    "organization", "category", "dateReceived", "toBeUsedBy",
    "email", "phoneNumber", "notes", "originalAmount",
  ];

  return (
    <div className="relative w-full">
      {isFetching && <FetchingOverlay />}

      {/* Stats banner */}
      <div className="border-t border-border -mx-8 px-8 py-4">
        <div className="flex flex-row items-start gap-10">
          <div className="flex flex-col">
            <span className="text-green-600 font-bold text-2xl">$0000</span>
            <span className="text-black text-sm -mt-1">available</span>
          </div>
          <div className="flex flex-col">
            <span className="text-red-600 font-bold text-2xl">X days</span>
            <span className="text-black text-sm -mt-1">until next grant is due</span>
          </div>
        </div>
      </div>

      <div className="border-t border-border -mx-8 px-8 flex flex-col gap-3 py-4">
        {/* Search row */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[240px] max-w-md flex-1 flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="grant-search">
              Organization
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="grant-search"
                placeholder="Search by organization…"
                value={tableState.draftSearch}
                onChange={(e) => tableState.setDraftSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    tableState.commitSearch();
                  }
                }}
                className="min-w-0 flex-1"
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0 gap-2"
                onClick={tableState.commitSearch}
              >
                <Search className="h-4 w-4" aria-hidden />
                Search
              </Button>
              <AdvancedFilterPopover
                description="Amount range and due date range"
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
                    <label className="text-xs text-muted-foreground" htmlFor="grant-min-amt">Min amount</label>
                    <Input id="grant-min-amt" type="number" min={0} step="0.01" placeholder="Min"
                      value={filters.draft.minAmount}
                      onChange={(e) => filters.setDraft({ minAmount: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground" htmlFor="grant-max-amt">Max amount</label>
                    <Input id="grant-max-amt" type="number" min={0} step="0.01" placeholder="Max"
                      value={filters.draft.maxAmount}
                      onChange={(e) => filters.setDraft({ maxAmount: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground" htmlFor="grant-due-from">Due from</label>
                    <Input id="grant-due-from" type="date" className="w-full min-w-0"
                      value={filters.draft.dueFrom}
                      onChange={(e) => filters.setDraft({ dueFrom: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground" htmlFor="grant-due-to">Due to</label>
                    <Input id="grant-due-to" type="date" className="w-full min-w-0"
                      value={filters.draft.dueTo}
                      onChange={(e) => filters.setDraft({ dueTo: e.target.value })} />
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
            onClick={() =>
              exportToCSV(
                ["Organization", "Category", "Date Received", "To Be Used By", "Email", "Phone Number", "Notes", "Original", "Spent", "Remaining"],
                localGrants.map((g) => [
                  g.organization, g.category,
                  g.dateReceived.toLocaleDateString(),
                  g.toBeUsedBy.toLocaleDateString(),
                  g.email, g.phoneNumber ?? "",
                  (g.notes ?? "").replace(/\n/g, " "),
                  g.originalAmount.toString(),
                  g.spentAmount.toString(),
                  g.remainingAmount.toString(),
                ]),
                "grant_list",
              )
            }
          >
            Export page
          </Button>

          <Button
            variant="outline"
            className="bg-[#45BAB8] text-white hover:bg-[#45BAB8]"
            onClick={() => setAddModalOpen(true)}
            disabled={!session?.user}
          >
            <CirclePlus /> Add Grant
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
            {addModalOpen ? (
              <InlineFormRow
                colCount={columns.length}
                className="bg-blue-50 hover:!bg-blue-50"
                onSave={async () => {
                  setAddModalError(null);
                  if (!session?.user) { setAddModalError("Please sign in to create grants"); return; }
                  const poolId = selectedPoolId ?? fundPools?.[0]?.id;
                  if (!poolId) { setAddModalError("Fund pool must be selected"); return; }
                  try {
                    await createMutation.mutateAsync({
                      organization: orgField, category: categoryField,
                      dateReceived: dateReceivedField || undefined,
                      toBeUsedBy: toBeUsedByField || undefined,
                      email: emailField || undefined, phoneNumber: phoneField || undefined,
                      notes: notesField || undefined, amount: Number(amountField) || 0,
                      fundPoolId: poolId,
                    });
                    resetInlineForm(); setAddModalOpen(false);
                  } catch (e: unknown) {
                    setAddModalError(e instanceof Error ? e.message : "Error creating grant");
                  }
                }}
                onSaveAndAddMore={async () => {
                  setAddModalError(null);
                  if (!session?.user) { setAddModalError("Please sign in to create grants"); return; }
                  const poolId = selectedPoolId ?? fundPools?.[0]?.id;
                  if (!poolId) { setAddModalError("Fund pool must be selected"); return; }
                  try {
                    await createMutation.mutateAsync({
                      organization: orgField, category: categoryField,
                      dateReceived: dateReceivedField || undefined,
                      toBeUsedBy: toBeUsedByField || undefined,
                      email: emailField || undefined, phoneNumber: phoneField || undefined,
                      notes: notesField || undefined, amount: Number(amountField) || 0,
                      fundPoolId: poolId,
                    });
                    resetInlineForm();
                  } catch (e: unknown) {
                    setAddModalError(e instanceof Error ? e.message : "Error creating grant");
                  }
                }}
                onCancel={() => { resetInlineForm(); setAddModalOpen(false); setAddModalError(null); }}
                isSaving={createMutation.isPending}
                error={addModalError}
              >
                <TableCell className="bg-blue-50 p-1">
                  <Input placeholder="organization name" value={orgField}
                    onChange={(e) => setOrgField(e.target.value)}
                    className="w-full h-7 bg-white placeholder:text-[#45BAB8] px-2" />
                </TableCell>
                <TableCell className="bg-blue-50 p-1">
                  {fundPools && fundPools.length > 0 ? (
                    <select
                      value={selectedPoolId ?? fundPools?.[0]?.id ?? ""}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        setSelectedPoolId(Number.isNaN(id) ? undefined : id);
                        const pool = fundPools.find((p: FundPool) => p.id === id);
                        setCategoryField(pool?.category ?? "");
                      }}
                      className="w-full h-7 bg-white px-2"
                    >
                      {fundPools.map((p: FundPool) => (
                        <option key={p.id} value={p.id}>{p.category}</option>
                      ))}
                    </select>
                  ) : (
                    <Input placeholder="category" value={categoryField}
                      onChange={(e) => setCategoryField(e.target.value)}
                      className="w-full h-7 bg-white placeholder:text-[#45BAB8] px-2" />
                  )}
                </TableCell>
                <TableCell className="bg-blue-50 p-1">
                  <Input type="date" value={dateReceivedField}
                    onChange={(e) => setDateReceivedField(e.target.value)}
                    className="w-full h-7 bg-white px-2" />
                </TableCell>
                <TableCell className="bg-blue-50 p-1">
                  <Input type="date" value={toBeUsedByField}
                    onChange={(e) => setToBeUsedByField(e.target.value)}
                    className="w-full h-7 bg-white px-2" />
                </TableCell>
                <TableCell className="bg-blue-50 p-1">
                  <Input placeholder="email" value={emailField}
                    onChange={(e) => setEmailField(e.target.value)}
                    className="w-full h-7 bg-white placeholder:text-[#45BAB8] px-2" />
                </TableCell>
                <TableCell className="bg-blue-50 p-1">
                  <Input placeholder="phone number" value={phoneField}
                    onChange={(e) => setPhoneField(e.target.value)}
                    className="w-full h-7 bg-white placeholder:text-[#45BAB8] px-2" />
                </TableCell>
                <TableCell className="bg-blue-50 p-1">
                  <Input placeholder="notes" value={notesField}
                    onChange={(e) => setNotesField(e.target.value)}
                    className="w-full h-7 bg-white placeholder:text-[#45BAB8] px-2" />
                </TableCell>
                <TableCell className="bg-blue-50 p-1">
                  <Input type="number" placeholder="amount" value={amountField}
                    onChange={(e) => setAmountField(e.target.value)}
                    className="w-full h-7 bg-white placeholder:text-[#45BAB8] px-2" />
                </TableCell>
                <TableCell className="bg-blue-50 p-1" />
              </InlineFormRow>
            ) : null}

            {table.getRowModel().rows.length > 0
              ? table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.original.id}
                    className={isGrantExpired(row.original.toBeUsedBy) ? "bg-muted/30" : undefined}
                  >
                    {row.getVisibleCells().map((cell) => {
                      if (cell.column.id === "actions") {
                        return (
                          <TableCell key={cell.id}>
                            <div className="flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>
                                    Actions for {row.original.organization}
                                  </DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const dbId = row.original.dbId;
                                      if (!dbId) {
                                        setRowErrors((s) => ({ ...s, [row.original.id]: "Cannot delete unsaved grant" }));
                                        return;
                                      }
                                      deleteMutation.mutate({ id: dbId });
                                    }}
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        );
                      }

                      if (editableColumns.includes(cell.column.id)) {
                        const isEditing =
                          editing?.rowId === row.original.id &&
                          editing?.columnId === cell.column.id;
                        const display = flexRender(cell.column.columnDef.cell, cell.getContext());

                        return (
                          <TableCell
                            key={cell.id}
                            onDoubleClick={() => {
                              setRowErrors((s) => ({ ...s, [row.original.id]: "" }));
                              setEditing({
                                rowId: row.original.id,
                                columnId: cell.column.id,
                                value:
                                  cell.column.id === "category"
                                    ? (row.original.fundPoolId ?? "")
                                    : row.original[cell.column.id as keyof Grant],
                              });
                            }}
                          >
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                {cell.column.id === "notes" ? (
                                  <textarea
                                    value={editing.value != null ? String(editing.value) : ""}
                                    onChange={(e) =>
                                      setEditing((p) => p && { ...p, value: e.target.value })
                                    }
                                    className="w-full h-20 p-2 border rounded"
                                  />
                                ) : cell.column.id === "originalAmount" ? (
                                  <Input
                                    type="number"
                                    value={Number(editing.value ?? 0)}
                                    onChange={(e) =>
                                      setEditing((p) => p && { ...p, value: Number(e.target.value) })
                                    }
                                    className="w-28"
                                  />
                                ) : cell.column.id === "dateReceived" || cell.column.id === "toBeUsedBy" ? (
                                  <Input
                                    type="date"
                                    value={
                                      editing.value instanceof Date
                                        ? editing.value.toISOString().slice(0, 10)
                                        : editing.value
                                          ? new Date(editing.value as string | number).toISOString().slice(0, 10)
                                          : ""
                                    }
                                    onChange={(e) =>
                                      setEditing((p) => p && { ...p, value: new Date(e.target.value) })
                                    }
                                  />
                                ) : cell.column.id === "category" ? (
                                  fundPools && fundPools.length > 0 ? (
                                    <select
                                      value={Number(editing.value ?? 0)}
                                      onChange={(e) =>
                                        setEditing((p) => p && { ...p, value: Number(e.target.value) })
                                      }
                                      className="w-full h-7 bg-white px-2"
                                    >
                                      {fundPools.map((p: FundPool) => (
                                        <option key={p.id} value={p.id}>{p.category}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <Input
                                      value={editing.value != null ? String(editing.value) : ""}
                                      onChange={(e) =>
                                        setEditing((p) => p && { ...p, value: e.target.value })
                                      }
                                    />
                                  )
                                ) : (
                                  <Input
                                    value={editing.value != null ? String(editing.value) : ""}
                                    onChange={(e) =>
                                      setEditing((p) => p && { ...p, value: e.target.value })
                                    }
                                  />
                                )}

                                <Button
                                  size="sm"
                                  onClick={() => {
                                    if (!editing) return;
                                    const { rowId, columnId, value } = editing;
                                    const target = localGrants.find((r) => r.id === rowId);
                                    const dbId = target?.dbId;
                                    if (!dbId) {
                                      setRowErrors((s) => ({ ...s, [rowId]: "Cannot update unsaved grant" }));
                                      setEditing(null);
                                      return;
                                    }
                                    const payload: UpdateGrantPayload = { id: dbId };
                                    if (columnId === "organization") payload.organization = String(value);
                                    else if (columnId === "category") {
                                      const chosenPoolId = Number(value);
                                      const pool = fundPools?.find((p: FundPool) => p.id === chosenPoolId);
                                      if (!pool) {
                                        setRowErrors((s) => ({ ...s, [rowId]: "Selected fund pool not found" }));
                                        setEditing(null);
                                        return;
                                      }
                                      payload.category = pool.category;
                                      payload.fundPoolId = chosenPoolId;
                                    } else if (columnId === "dateReceived")
                                      payload.dateReceived = value instanceof Date ? value : new Date(String(value));
                                    else if (columnId === "toBeUsedBy")
                                      payload.toBeUsedBy = value instanceof Date ? value : new Date(String(value));
                                    else if (columnId === "email") payload.email = String(value);
                                    else if (columnId === "phoneNumber") payload.phoneNumber = String(value);
                                    else if (columnId === "notes") payload.notes = String(value);
                                    else if (columnId === "originalAmount") payload.amount = Number(value) || 0;

                                    updateMutation.mutate(payload, {
                                      onSuccess: () => {
                                        setRowErrors((s) => ({ ...s, [rowId]: "" }));
                                      },
                                    });
                                    setEditing(null);
                                  }}
                                >
                                  Save
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div>
                                {display}
                                {rowErrors[row.original.id] ? (
                                  <div className="text-red-600 text-sm">{rowErrors[row.original.id]}</div>
                                ) : null}
                              </div>
                            )}
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
                ))
              : <TableEmptyRow colCount={columns.length} />}
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
