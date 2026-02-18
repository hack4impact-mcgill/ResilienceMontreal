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

import { ListFilter, Check, CirclePlus, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
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
import { api } from "@/trpc/react";

// Inline add form is rendered directly inside GrantsTable; modal removed in favor of inline UX.

// ------------------------------------------------------------
// EXPORT TO CSV
// ------------------------------------------------------------
const exportToCSV = (grants: Grant[]) => {
  if (!grants.length) return;

  const header = [
    "Organization",
    "Category",
    "Date Received",
    "To Be Used By",
    "Email",
    "Phone Number",
    "Notes",
    "Amount",
  ];

  const rows = grants.map((g) => [
    g.organization,
    g.category,
    g.dateReceived.toLocaleDateString(),
    g.toBeUsedBy.toLocaleDateString(),
    g.email,
    g.phoneNumber ?? "",
    (g.notes ?? "").replace(/\n/g, " "),
    g.amount.toString(),
  ]);

  const csvContent = [header, ...rows].map((r) => r.join(",")).join("\n");

  const now = new Date();
  const dateStr = `${now.getMonth() + 1}-${now.getDate()}-${now.getFullYear().toString().slice(-2)}`;
  const fileName = `grant_list_${dateStr}.csv`;

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
export const GrantsTable = () => {
  const [localGrants, setLocalGrants] = React.useState<Grant[]>([]);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const [filterColumn, setFilterColumn] = React.useState<"organization" | "category" | "email">("organization");
  const [filterMenuOpen, setFilterMenuOpen] = React.useState(false);

  const [addModalOpen, setAddModalOpen] = React.useState(false);

  const utils = api.useContext();
  const { data: session } = api.auth.getSession.useQuery();
  const { data: dbGrants, isLoading, isError } = api.grant.getAll.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 60_000,
    enabled: Boolean(session?.user),
  });

  const { data: fundPools } = api.fundPool.getFundPools.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: Boolean(session?.user),
  });

  const [addModalError, setAddModalError] = React.useState<string | null>(null);

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
    setOrgField("");
    setCategoryField("");
    setDateReceivedField("");
    setToBeUsedByField("");
    setEmailField("");
    setPhoneField("");
    setNotesField("");
    setAmountField("");
    setSelectedPoolId(undefined);
  };

  // default the selected pool to the first available pool when opening the inline add form
  React.useEffect(() => {
    if (addModalOpen && fundPools && fundPools.length > 0 && selectedPoolId === undefined) {
      setSelectedPoolId(fundPools[0].id);
      setCategoryField(fundPools[0].category ?? "");
    }
  }, [addModalOpen, fundPools]);

  const createMutation = api.grant.create.useMutation({
    onSuccess: async () => {
      await (utils as any).grant.getAll.invalidate();
    },
    onError: (err: any) => {
      console.error("Create grant error:", err);
      setAddModalError(err?.message ?? "Error creating grant");
    },
  });

  const updateMutation = api.grant.update.useMutation({
    onSuccess: async () => {
      await (utils as any).grant.getAll.invalidate();
    },
  });

  const deleteMutation = api.grant.delete.useMutation({
    onSuccess: async () => {
      await (utils as any).grant.getAll.invalidate();
    },
  });

  const [rowErrors, setRowErrors] = React.useState<Record<string, string>>({});
  const [editing, setEditing] = React.useState<{ rowId: string; columnId: string; value: any } | null>(null);
  const previousSnapshotRef = React.useRef<Grant[] | null>(null);
  React.useEffect(() => {
    if (!dbGrants) return;

    const mapped = dbGrants.map((g: any) => {
      let meta: any = {};
      try {
        meta = g.description ? JSON.parse(g.description) : {};
      } catch (e) {
        meta = { notes: g.description };
      }

      return {
        id: String(g.id),
        dbId: g.id,
        fundPoolId: g.distributions?.[0]?.fundPool?.id ?? undefined,
        organization: g.title,
        category: meta.category ?? "",
        dateReceived: meta.dateReceived ? new Date(meta.dateReceived) : new Date(g.createdAt),
        toBeUsedBy: meta.toBeUsedBy ? new Date(meta.toBeUsedBy) : new Date(g.endDate || g.createdAt),
        email: meta.email ?? "",
        phoneNumber: meta.phoneNumber ?? "",
        notes: meta.notes ?? "",
        amount: Number(g.totalAmount?.toString?.() ?? g.totalAmount ?? 0),
      } as Grant;
    });

    setLocalGrants(mapped);
  }, [dbGrants]);

  // If there is no server data (for example because the user is signed out
  // or the query is disabled), fall back to local mock data so the table
  // always shows rows and the headers remain visible while adding items.
  // No mock fallback: when unauthenticated there will be no grants to display.
  // localGrants is populated only from server `dbGrants` above.

  const table = useReactTable<Grant>({
    data: localGrants,
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
    if (col === "organization") return "Organization";
    if (col === "category") return "Category";
    if (col === "email") return "Email";
    return col;
  };

  if (isLoading) return <div>Loading...</div>;

  type FilterColumn = "organization" | "category" | "email";

  return (
    <div className="w-full">
      {/* Top Messages (placeholder - mirrors clients) */}
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

      {/* Filter Row */}
      <div className="border-t border-border -mx-8 px-8 flex items-center py-4">
        <Input
          placeholder={`Search by ${prettyLabel(filterColumn)}...`}
          value={(table.getColumn(filterColumn)?.getFilterValue() as string) ?? ""}
          onChange={(e) => table.getColumn(filterColumn)?.setFilterValue(e.target.value)}
          className="max-w-sm"
        />

        <DropdownMenu open={filterMenuOpen} onOpenChange={setFilterMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="ml-2 flex items-center gap-2 px-2 py-1 h-auto hover:bg-transparent">
              <ListFilter className={`transition-transform ${filterMenuOpen ? "rotate-90" : "rotate-0"}`} />
              <span>Filter</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start">
            {["organization", "category", "email"].map((col) => (
              <DropdownMenuItem
                key={col}
                onClick={() => {
                  table.getColumn(filterColumn)?.setFilterValue("");
                  setFilterColumn(col as FilterColumn);
                  setFilterMenuOpen(false);
                }}
                className="flex items-center gap-2"
              >
                {filterColumn === col ? <Check className="h-4 w-4" /> : <span className="h-4 w-4 opacity-0" />}
                {prettyLabel(col)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" className="ml-auto text-black hover:bg-transparent" onClick={() => exportToCSV(localGrants)}>
          Export
        </Button>

        <Button variant="outline" className="bg-[#45BAB8] text-white hover:bg-[#45BAB8]" onClick={() => setAddModalOpen(true)} disabled={!session?.user}>
          <CirclePlus /> Add Grant
        </Button>
      </div>

      {/* Inline Add Grant form (replaces removed modal) */}
      {/* Inline add row will be rendered inside the table body to align under headers */}

      <div className="-mx-8">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
                ))}
              </TableRow>

              
            ))}
          </TableHeader>

          <TableBody>
            {addModalOpen ? (
              // render inline form as the first row so inputs align under headers
              <>
              <TableRow className="bg-blue-50 hover:!bg-blue-50">
                <TableCell className="bg-blue-50 p-1">
                  <Input
                    placeholder="organization name"
                    value={orgField}
                    onChange={(e) => setOrgField(e.target.value)}
                    className="w-full h-7 bg-white placeholder:text-[#45BAB8] px-2"
                  />
                </TableCell>
                <TableCell className="bg-blue-50 p-1">
                  {fundPools && fundPools.length > 0 ? (
                    <select
                      value={selectedPoolId ?? (fundPools?.[0]?.id ?? "")}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        setSelectedPoolId(Number.isNaN(id) ? undefined : id);
                        const pool = fundPools.find((p: any) => p.id === id);
                        setCategoryField(pool?.category ?? "");
                      }}
                      className="w-full h-7 bg-white px-2"
                    >
                      {fundPools.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.category}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      placeholder="category"
                      value={categoryField}
                      onChange={(e) => setCategoryField(e.target.value)}
                      className="w-full h-7 bg-white placeholder:text-[#45BAB8] px-2"
                    />
                  )}
                </TableCell>
                <TableCell className="bg-blue-50 p-1">
                  <Input
                    type="date"
                    placeholder="date received"
                    value={dateReceivedField}
                    onChange={(e) => setDateReceivedField(e.target.value)}
                    className="w-full h-7 bg-white placeholder:text-[#45BAB8] px-2"
                  />
                </TableCell>
                <TableCell className="bg-blue-50 p-1">
                  <Input
                    type="date"
                    placeholder="to be used by"
                    value={toBeUsedByField}
                    onChange={(e) => setToBeUsedByField(e.target.value)}
                    className="w-full h-7 bg-white placeholder:text-[#45BAB8] px-2"
                  />
                </TableCell>
                <TableCell className="bg-blue-50 p-1">
                  <Input
                    placeholder="email"
                    value={emailField}
                    onChange={(e) => setEmailField(e.target.value)}
                    className="w-full h-7 bg-white placeholder:text-[#45BAB8] px-2"
                  />
                </TableCell>
                <TableCell className="bg-blue-50 p-1">
                  <Input
                    placeholder="phone number"
                    value={phoneField}
                    onChange={(e) => setPhoneField(e.target.value)}
                    className="w-full h-7 bg-white placeholder:text-[#45BAB8] px-2"
                  />
                </TableCell>
                <TableCell className="bg-blue-50 p-1">
                  <Input
                    placeholder="notes"
                    value={notesField}
                    onChange={(e) => setNotesField(e.target.value)}
                    className="w-full h-7 bg-white placeholder:text-[#45BAB8] px-2"
                  />
                </TableCell>
                <TableCell className="bg-blue-50 p-1">
                  <Input
                    type="number"
                    placeholder="amount"
                    value={amountField}
                    onChange={(e) => setAmountField(e.target.value)}
                    className="w-full h-7 bg-white placeholder:text-[#45BAB8] px-2"
                  />
                </TableCell>
                {/* actions column placeholder to keep columns aligned and avoid white gap */}
                <TableCell className="bg-blue-50 p-1" />
              </TableRow>

              <TableRow className="bg-blue-50 hover:!bg-blue-50">
                <TableCell colSpan={columns.length} className="bg-blue-50 p-1">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1" />

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        className="border-[#45BAB8] text-[#45BAB8] bg-transparent hover:bg-transparent h-7 px-2"
                        onClick={() => {
                          resetInlineForm();
                          setAddModalOpen(false);
                          setAddModalError(null);
                        }}
                      >
                        Cancel
                      </Button>

                      <Button className="bg-[#45BAB8] text-white hover:bg-[#45BAB8] h-7 px-2" onClick={async () => {
                        setAddModalError(null);
                        if (!session?.user) {
                          setAddModalError("Please sign in to create grants");
                          return;
                        }

                        const poolId = selectedPoolId ?? fundPools?.[0]?.id;
                        if (!poolId) {
                          setAddModalError("Fund pool must be selected");
                          return;
                        }

                        try {
                          await createMutation.mutateAsync({
                            organization: orgField,
                            category: categoryField,
                            dateReceived: dateReceivedField || undefined,
                            toBeUsedBy: toBeUsedByField || undefined,
                            email: emailField || undefined,
                            phoneNumber: phoneField || undefined,
                            notes: notesField || undefined,
                            amount: Number(amountField) || 0,
                            fundPoolId: poolId,
                          });
                          resetInlineForm();
                          setAddModalOpen(false);
                        } catch (e: any) {
                          setAddModalError(e?.message ?? "Error creating grant");
                        }
                      }}>
                        Save
                      </Button>

                      <Button className="bg-[#45BAB8] text-white hover:bg-[#45BAB8] h-7 px-2" onClick={async () => {
                        setAddModalError(null);
                        if (!session?.user) {
                          setAddModalError("Please sign in to create grants");
                          return;
                        }

                        const poolId = selectedPoolId ?? fundPools?.[0]?.id;
                        if (!poolId) {
                          setAddModalError("Fund pool must be selected");
                          return;
                        }

                        try {
                          await createMutation.mutateAsync({
                            organization: orgField,
                            category: categoryField,
                            dateReceived: dateReceivedField || undefined,
                            toBeUsedBy: toBeUsedByField || undefined,
                            email: emailField || undefined,
                            phoneNumber: phoneField || undefined,
                            notes: notesField || undefined,
                            amount: Number(amountField) || 0,
                            fundPoolId: poolId,
                          });
                          // keep the form open for another entry
                          resetInlineForm();
                        } catch (e: any) {
                          setAddModalError(e?.message ?? "Error creating grant");
                        }
                      }}>
                        Save and Add More
                      </Button>
                    </div>
                  </div>
                  {addModalError ? <div className="text-red-600 mt-2">{addModalError}</div> : null}
                </TableCell>
              </TableRow>

              </>
            ) : null}

            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    // render actions column manually so we can inject delete handler
                    if (cell.column.id === "actions") {
                      return (
                        <TableCell key={cell.id}>
                          {/* recreate the actions menu but with Delete wired */}
                          <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions for {row.original.organization}</DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => {
                                    // delete: optimistic UI handled by invalidation; show inline error on failure
                                    const dbId = row.original.dbId;
                                    if (!dbId) {
                                      // can't delete a non-persisted mock row
                                      setRowErrors((s) => ({ ...s, [row.id]: "Cannot delete unsaved grant" }));
                                      return;
                                    }

                                    previousSnapshotRef.current = localGrants.slice();
                                    // optimistic remove
                                    setLocalGrants((prev) => prev.filter((r) => r.id !== row.id));

                                    deleteMutation.mutate(
                                      { id: dbId },
                                      {
                                        onError: (err: any) => {
                                          // revert
                                          if (previousSnapshotRef.current) setLocalGrants(previousSnapshotRef.current);
                                          setRowErrors((s) => ({ ...s, [row.id]: err?.message ?? "Failed to delete" }));
                                        },
                                      }
                                    );
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

                    // default rendering with inline edit support for editable columns
                    const editableColumns = ["organization", "category", "dateReceived", "toBeUsedBy", "email", "phoneNumber", "notes", "amount"];
                    if (editableColumns.includes(cell.column.id)) {
                      const isEditing = editing?.rowId === row.id && editing?.columnId === cell.column.id;
                      const display = flexRender(cell.column.columnDef.cell, cell.getContext());

                      return (
                        <TableCell
                          key={cell.id}
                          onDoubleClick={() => {
                            setRowErrors((s) => ({ ...s, [row.id]: "" }));
                            // for category, seed editor with the fundPoolId; otherwise use the existing cell value
                            setEditing({
                              rowId: row.id,
                              columnId: cell.column.id,
                              value: cell.column.id === "category" ? (row.original.fundPoolId ?? "") : row.original[cell.column.id as keyof Grant],
                            });
                          }}
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              {cell.column.id === "notes" ? (
                                <textarea
                                  value={editing.value ?? ""}
                                  onChange={(e) => setEditing((p) => p && { ...p, value: e.target.value })}
                                  className="w-full h-20 p-2 border rounded"
                                />
                              ) : cell.column.id === "amount" ? (
                                <Input
                                  type="number"
                                  value={editing.value ?? 0}
                                  onChange={(e) => setEditing((p) => p && { ...p, value: Number(e.target.value) })}
                                  className="w-28"
                                />
                              ) : cell.column.id === "dateReceived" || cell.column.id === "toBeUsedBy" ? (
                                <Input
                                  type="date"
                                  value={editing.value ? new Date(editing.value).toISOString().slice(0, 10) : ""}
                                  onChange={(e) => setEditing((p) => p && { ...p, value: new Date(e.target.value) })}
                                />
                              ) : cell.column.id === "category" ? (
                                fundPools && fundPools.length > 0 ? (
                                  <select
                                    value={editing.value ?? ""}
                                    onChange={(e) => setEditing((p) => p && { ...p, value: Number(e.target.value) })}
                                    className="w-full h-7 bg-white px-2"
                                  >
                                    {fundPools.map((p: any) => (
                                      <option key={p.id} value={p.id}>
                                        {p.category}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <Input
                                    value={editing.value ?? ""}
                                    onChange={(e) => setEditing((p) => p && { ...p, value: e.target.value })}
                                  />
                                )
                              ) : (
                                <Input
                                  value={editing.value ?? ""}
                                  onChange={(e) => setEditing((p) => p && { ...p, value: e.target.value })}
                                />
                              )}

                              <Button
                                size="sm"
                                onClick={() => {
                                  if (!editing) return;
                                  const { rowId, columnId, value } = editing;
                                  const prev = localGrants.slice();
                                  previousSnapshotRef.current = prev;

                                  // optimistic update
                                  if (columnId === "category") {
                                    const chosenPoolId = Number(value);
                                    const pool = fundPools?.find((p: any) => p.id === chosenPoolId);
                                    setLocalGrants((curr) => curr.map((r) => (r.id === rowId ? { ...r, category: pool?.category ?? "", fundPoolId: chosenPoolId } : r)));
                                  } else {
                                    setLocalGrants((curr) => curr.map((r) => (r.id === rowId ? { ...r, [columnId]: value } : r)));
                                  }

                                  // build payload for update mutation; include dbId if present
                                  const target = localGrants.find((r) => r.id === rowId);
                                  const dbId = target?.dbId;
                                  if (!dbId) {
                                    // can't update mock-only row on server
                                    setRowErrors((s) => ({ ...s, [rowId]: "Cannot update unsaved grant" }));
                                    setLocalGrants(prev);
                                    setEditing(null);
                                    return;
                                  }

                                  const payload: any = { id: dbId };
                                  // map columnId to server fields
                                  if (columnId === "organization") payload.organization = value;
                                  else if (columnId === "category") {
                                    const chosenPoolId = Number(value);
                                    const pool = fundPools?.find((p: any) => p.id === chosenPoolId);
                                    if (!pool) {
                                      // revert
                                      if (previousSnapshotRef.current) setLocalGrants(previousSnapshotRef.current);
                                      setRowErrors((s) => ({ ...s, [rowId]: "Selected fund pool not found" }));
                                      setEditing(null);
                                      return;
                                    }
                                    payload.category = pool.category;
                                    payload.fundPoolId = chosenPoolId;
                                  }
                                  else if (columnId === "dateReceived") payload.dateReceived = value;
                                  else if (columnId === "toBeUsedBy") payload.toBeUsedBy = value;
                                  else if (columnId === "email") payload.email = value;
                                  else if (columnId === "phoneNumber") payload.phoneNumber = value;
                                  else if (columnId === "notes") payload.notes = value;
                                  else if (columnId === "amount") payload.amount = Number(value) || 0;

                                  updateMutation.mutate(payload, {
                                    onError: (err: any) => {
                                      // revert
                                      if (previousSnapshotRef.current) setLocalGrants(previousSnapshotRef.current);
                                      setRowErrors((s) => ({ ...s, [rowId]: err?.message ?? "Failed to save" }));
                                    },
                                    onSuccess: () => {
                                      setRowErrors((s) => ({ ...s, [rowId]: "" }));
                                    },
                                  });

                                  setEditing(null);
                                }}
                              >
                                Save
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // cancel
                                  setEditing(null);
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div>
                              {display}
                              {rowErrors[row.id] ? <div className="text-red-600 text-sm">{rowErrors[row.id]}</div> : null}
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
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
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
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          Next
        </Button>
      </div>

      
    </div>
  );
};
