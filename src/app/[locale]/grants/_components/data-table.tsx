"use client";

import { TableLoadingState } from "@/components/data-table/TableLoadingState";
import * as React from "react";
import {
  ExpandedState,
  flexRender,
  getCoreRowModel,
  RowSelectionState,
  useReactTable,
} from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { CirclePlus, Search } from "lucide-react";

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

import { columns, formatMoney, Grant, type GrantSplitPart } from "./columns";
import { GrantSplitEditor, type SplitRow } from "./grant-split-editor";
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
import { RowActionsDropdown } from "@/components/data-table/RowActionsDropdown";
import { DeleteConfirmDialog } from "@/components/data-table/DeleteConfirmDialog";
import { DetailSplit, useDetailPanel } from "@/components/detail-panel";
import { GrantPanel } from "./grant-panel";
import { parseGrantMeta } from "@/lib/grant-meta";
import { formatPercent, splitCents, splitError } from "@/lib/grant-split";

type GrantSortBy = "totalAmount" | "endDate" | "createdAt" | "title";
type FundPool = RouterOutputs["fundPool"]["getAll"][number];
type DbGrant = RouterOutputs["grant"]["getGrants"]["grants"][number];

function isGrantExpired(toBeUsedBy: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(toBeUsedBy);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

function mapDbGrant(g: DbGrant): Grant {
  const meta = parseGrantMeta(g.description);
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
  const splits: GrantSplitPart[] =
    distributions.length > 1
      ? distributions.map((d) => {
          const original = Number(d.amount);
          const spent = Number(d.spentAmount);
          return {
            distributionId: d.id,
            category: d.fundPool?.category ?? "Uncategorized",
            percent: originalAmount > 0 ? (original / originalAmount) * 100 : 0,
            originalAmount: original,
            spentAmount: spent,
            remainingAmount: original - spent,
          };
        })
      : [];
  return {
    id: String(g.id),
    dbId: g.id,
    fundPoolId: g.distributions?.[0]?.fundPool?.id ?? undefined,
    organization: g.title,
    category: splits.length
      ? splits
          .map((s) => `${s.category} ${formatPercent(s.percent)}`)
          .join(" / ")
      : (g.distributions?.[0]?.fundPool?.category ??
        String(meta.category ?? "")),
    splits,
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

// Cell content for one category row under an expanded split grant
function splitPartCell(columnId: string, part: GrantSplitPart) {
  switch (columnId) {
    case "category":
      return (
        <span className="pl-5">
          {part.category} · {formatPercent(part.percent)}
        </span>
      );
    case "originalAmount":
      return formatMoney(part.originalAmount);
    case "spentAmount":
      return formatMoney(part.spentAmount);
    case "remainingAmount":
      return formatMoney(part.remainingAmount);
    default:
      return null;
  }
}

const SORT_FIELDS = [
  { value: "createdAt" as const, label: "Date created" },
  { value: "endDate" as const, label: "Due date" },
  { value: "totalAmount" as const, label: "Amount" },
  { value: "title" as const, label: "Organization (A–Z)" },
];

const EMPTY_FILTERS = { minAmount: "", maxAmount: "", dueFrom: "", dueTo: "" };

const GrantsTableContent = ({ onView }: { onView: (id: number) => void }) => {
  const t = useTranslations("grants");
  const tCommon = useTranslations("common");
  const tableState = useServerTableState<GrantSortBy>({
    defaultSortBy: "createdAt",
  });
  const filters = useAdvancedFilters(EMPTY_FILTERS);

  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [addModalError, setAddModalError] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<{
    id: number;
    name: string;
  } | null>(null);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [bulkPoolId, setBulkPoolId] = React.useState<number | undefined>(
    undefined,
  );

  // Inline add form state
  const [orgField, setOrgField] = React.useState("");
  const [categoryField, setCategoryField] = React.useState("");
  const [dateReceivedField, setDateReceivedField] = React.useState("");
  const [toBeUsedByField, setToBeUsedByField] = React.useState("");
  const [emailField, setEmailField] = React.useState("");
  const [phoneField, setPhoneField] = React.useState("");
  const [notesField, setNotesField] = React.useState("");
  const [amountField, setAmountField] = React.useState("");
  const [selectedPoolId, setSelectedPoolId] = React.useState<
    number | undefined
  >(undefined);
  // null while the new grant goes to a single fund pool
  const [splitLines, setSplitLines] = React.useState<SplitRow[] | null>(null);
  const nextSplitKey = React.useRef(0);
  const newSplitLine = (fundPoolId = ""): SplitRow => ({
    key: nextSplitKey.current++,
    fundPoolId,
    percent: "",
  });
  const [expanded, setExpanded] = React.useState<ExpandedState>({});

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
    setSplitLines(null);
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
  }, [
    tableState.page,
    tableState.limit,
    tableState.sortBy,
    tableState.sortOrder,
    tableState.appliedSearch,
    filters.applied,
  ]);

  // Selection only covers rows on screen, so clear it when the page, filters, sort or search change
  React.useEffect(() => {
    setRowSelection({});
  }, [queryInput]);

  const utils = api.useContext();
  const { data: session } = api.auth.getSession.useQuery();
  const { data: currentUser } = api.users.me.useQuery();
  // same roles that can load fund pools (and so change a grant's category)
  const canBulkEdit =
    currentUser?.role === "Admin" ||
    currentUser?.role === "Bookkeeper" ||
    currentUser?.role === "InterventionTeam";

  const {
    data: grantListResult,
    isLoading,
    isError,
    isFetching,
  } = api.grant.getGrants.useQuery(queryInput, {
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const pagination = grantListResult?.pagination;
  const dbGrants = grantListResult?.grants;

  React.useEffect(() => {
    if (!pagination || pagination.totalPages <= 0) return;
    if (tableState.page > pagination.totalPages)
      tableState.setPage(pagination.totalPages);
  }, [pagination, tableState.page]);

  const { data: fundPools } = api.fundPool.getAll.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Seed default pool when add form opens
  React.useEffect(() => {
    if (
      addModalOpen &&
      fundPools &&
      fundPools.length > 0 &&
      selectedPoolId === undefined
    ) {
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
    onSuccess: async () => {
      await invalidateAll();
    },
    onError: (err) => setAddModalError(err.message ?? "Error creating grant"),
  });

  const bulkCategoryMutation = api.grant.bulkUpdateCategory.useMutation({
    onSuccess: async ({ movedCount }) => {
      setRowSelection({});
      setBulkPoolId(undefined);
      toast.success(t("bulkMoved", { count: movedCount }));
      await Promise.all([
        utils.grant.getGrants.invalidate(),
        utils.fundPool.getAll.invalidate(),
        utils.fundPool.getUncategorized.invalidate(),
      ]);
    },
    onError: (err) => toast.error(err.message),
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
    getRowId: (row) => row.id,
    // bulk category change only works on grants in a single fund pool
    enableRowSelection: (row) =>
      canBulkEdit && row.original.splits.length === 0,
    getRowCanExpand: (row) => row.original.splits.length > 0,
    state: {
      rowSelection,
      expanded,
      columnVisibility: { select: canBulkEdit },
    },
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpanded,
  });

  // Creates the grant from the inline form; true when it was saved.
  const createGrant = async (): Promise<boolean> => {
    setAddModalError(null);
    if (!session?.user) {
      setAddModalError("Please sign in to create grants");
      return false;
    }
    const amount = Number(amountField) || 0;
    let target: Pick<
      RouterInputs["grant"]["create"],
      "fundPoolId" | "splits" | "category"
    >;
    if (splitLines) {
      const error = splitError(amount, splitLines);
      if (error) {
        setAddModalError(error);
        return false;
      }
      const cents = splitCents(amount, splitLines);
      target = {
        splits: splitLines.map((line, i) => ({
          fundPoolId: Number(line.fundPoolId),
          amount: cents[i]! / 100,
        })),
        category: splitLines
          .map(
            (line) =>
              fundPools?.find((p) => String(p.id) === line.fundPoolId)
                ?.category,
          )
          .join(" / "),
      };
    } else {
      const poolId = selectedPoolId ?? fundPools?.[0]?.id;
      if (!poolId) {
        setAddModalError("Fund pool must be selected");
        return false;
      }
      target = { fundPoolId: poolId, category: categoryField };
    }
    try {
      await createMutation.mutateAsync({
        organization: orgField,
        dateReceived: dateReceivedField || undefined,
        toBeUsedBy: toBeUsedByField || undefined,
        email: emailField || undefined,
        phoneNumber: phoneField || undefined,
        notes: notesField || undefined,
        amount,
        ...target,
      });
      return true;
    } catch (e: unknown) {
      setAddModalError(e instanceof Error ? e.message : "Error creating grant");
      return false;
    }
  };

  const visibleColCount = table.getVisibleLeafColumns().length;
  const selectedGrantIds = table
    .getSelectedRowModel()
    .rows.map((row) => row.original.dbId)
    .filter((id): id is number => id !== undefined);

  if (isLoading && !grantListResult) return <TableLoadingState />;
  if (isError)
    return (
      <div className="text-destructive">
        Could not load grants. Please try again.
      </div>
    );

  const hasDraft = Boolean(
    filters.draft.minAmount.trim() ||
      filters.draft.maxAmount.trim() ||
      filters.draft.dueFrom ||
      filters.draft.dueTo,
  );

  return (
    <div className="relative w-full">
      <DeleteConfirmDialog
        open={deleteTarget !== null}
        entityName={deleteTarget?.name}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate({ id: deleteTarget.id });
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
      {isFetching && <FetchingOverlay />}

      <div className="flex flex-col gap-3 py-4">
        {/* Search row */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[240px] max-w-md flex-1 flex-col gap-1">
            <label
              className="text-xs text-muted-foreground"
              htmlFor="grant-search"
            >
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
                    <label
                      className="text-xs text-muted-foreground"
                      htmlFor="grant-min-amt"
                    >
                      Min amount
                    </label>
                    <Input
                      id="grant-min-amt"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Min"
                      value={filters.draft.minAmount}
                      onChange={(e) =>
                        filters.setDraft({ minAmount: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label
                      className="text-xs text-muted-foreground"
                      htmlFor="grant-max-amt"
                    >
                      Max amount
                    </label>
                    <Input
                      id="grant-max-amt"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Max"
                      value={filters.draft.maxAmount}
                      onChange={(e) =>
                        filters.setDraft({ maxAmount: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label
                      className="text-xs text-muted-foreground"
                      htmlFor="grant-due-from"
                    >
                      Due from
                    </label>
                    <Input
                      id="grant-due-from"
                      type="date"
                      className="w-full min-w-0"
                      value={filters.draft.dueFrom}
                      onChange={(e) =>
                        filters.setDraft({ dueFrom: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label
                      className="text-xs text-muted-foreground"
                      htmlFor="grant-due-to"
                    >
                      Due to
                    </label>
                    <Input
                      id="grant-due-to"
                      type="date"
                      className="w-full min-w-0"
                      value={filters.draft.dueTo}
                      onChange={(e) =>
                        filters.setDraft({ dueTo: e.target.value })
                      }
                    />
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
                [
                  "Organization",
                  "Category",
                  "Date Received",
                  "To Be Used By",
                  "Email",
                  "Phone Number",
                  "Notes",
                  "Original",
                  "Spent",
                  "Remaining",
                ],
                localGrants.map((g) => [
                  g.organization,
                  g.category,
                  g.dateReceived.toLocaleDateString(),
                  g.toBeUsedBy.toLocaleDateString(),
                  g.email,
                  g.phoneNumber ?? "",
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

        {selectedGrantIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3 rounded-md bg-muted px-3 py-2">
            <label
              className="text-sm text-muted-foreground"
              htmlFor="grant-bulk-category"
            >
              {t.rich("changeCategoryOfSelected", {
                count: selectedGrantIds.length,
                count_text: (chunks) => (
                  <span className="font-medium text-foreground">{chunks}</span>
                ),
              })}
            </label>
            <select
              id="grant-bulk-category"
              value={bulkPoolId ?? ""}
              onChange={(e) =>
                setBulkPoolId(
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              className="h-7 rounded-md bg-white px-2"
            >
              <option value="">{t("chooseCategory")}</option>
              {fundPools?.map((p: FundPool) => (
                <option key={p.id} value={p.id}>
                  {p.category}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              className="h-7"
              disabled={
                bulkPoolId === undefined || bulkCategoryMutation.isPending
              }
              onClick={() => {
                if (bulkPoolId === undefined) return;
                bulkCategoryMutation.mutate({
                  ids: selectedGrantIds,
                  fundPoolId: bulkPoolId,
                });
              }}
            >
              {bulkCategoryMutation.isPending ? t("applying") : t("apply")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto text-destructive hover:text-destructive"
              onClick={() => setRowSelection({})}
            >
              {t("clearSelection")}
            </Button>
          </div>
        ) : null}
      </div>

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
            {addModalOpen ? (
              <InlineFormRow
                colCount={visibleColCount}
                className="bg-blue-50 hover:!bg-blue-50"
                onSave={async () => {
                  if (await createGrant()) {
                    resetInlineForm();
                    setAddModalOpen(false);
                  }
                }}
                onSaveAndAddMore={async () => {
                  if (await createGrant()) resetInlineForm();
                }}
                onCancel={() => {
                  resetInlineForm();
                  setAddModalOpen(false);
                  setAddModalError(null);
                }}
                isSaving={createMutation.isPending}
                error={addModalError}
                belowFields={
                  splitLines && (
                    <GrantSplitEditor
                      colCount={visibleColCount}
                      className="bg-blue-50 hover:!bg-blue-50"
                      lines={splitLines}
                      onChange={(lines) => {
                        setSplitLines(lines);
                        // the live check under the split replaces a stale save error
                        setAddModalError(null);
                      }}
                      onAddLine={() =>
                        setSplitLines((prev) => [
                          ...(prev ?? []),
                          newSplitLine(),
                        ])
                      }
                      fundPools={fundPools ?? []}
                      totalAmount={Number(amountField) || 0}
                    />
                  )
                }
              >
                {canBulkEdit ? <TableCell className="bg-blue-50 p-1" /> : null}
                <TableCell className="bg-blue-50 p-1">
                  <Input
                    placeholder="organization name"
                    value={orgField}
                    onChange={(e) => setOrgField(e.target.value)}
                    className="w-full h-7 bg-white placeholder:text-[#45BAB8] px-2"
                  />
                </TableCell>
                <TableCell className="bg-blue-50 p-1">
                  {splitLines ? (
                    <div className="flex items-center gap-1">
                      <span className="text-sm">Split</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setSplitLines(null)}
                      >
                        Don&apos;t split
                      </Button>
                    </div>
                  ) : fundPools && fundPools.length > 1 ? (
                    <div className="flex items-center gap-1">
                      <select
                        value={selectedPoolId ?? fundPools[0]?.id ?? ""}
                        onChange={(e) => {
                          const id = Number(e.target.value);
                          setSelectedPoolId(Number.isNaN(id) ? undefined : id);
                          const pool = fundPools.find(
                            (p: FundPool) => p.id === id,
                          );
                          setCategoryField(pool?.category ?? "");
                        }}
                        className="w-full h-7 bg-white px-2"
                      >
                        {fundPools.map((p: FundPool) => (
                          <option key={p.id} value={p.id}>
                            {p.category}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-[#3FA9A9]"
                        onClick={() =>
                          setSplitLines([
                            newSplitLine(
                              String(selectedPoolId ?? fundPools[0]?.id ?? ""),
                            ),
                            newSplitLine(),
                          ])
                        }
                      >
                        Split
                      </Button>
                    </div>
                  ) : fundPools && fundPools.length > 0 ? (
                    <select
                      value={selectedPoolId ?? fundPools?.[0]?.id ?? ""}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        setSelectedPoolId(Number.isNaN(id) ? undefined : id);
                        const pool = fundPools.find(
                          (p: FundPool) => p.id === id,
                        );
                        setCategoryField(pool?.category ?? "");
                      }}
                      className="w-full h-7 bg-white px-2"
                    >
                      {fundPools.map((p: FundPool) => (
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
                    value={dateReceivedField}
                    onChange={(e) => setDateReceivedField(e.target.value)}
                    className="w-full h-7 bg-white px-2"
                  />
                </TableCell>
                <TableCell className="bg-blue-50 p-1">
                  <Input
                    type="date"
                    value={toBeUsedByField}
                    onChange={(e) => setToBeUsedByField(e.target.value)}
                    className="w-full h-7 bg-white px-2"
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
                <TableCell className="bg-blue-50 p-1" />
              </InlineFormRow>
            ) : null}

            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.original.id}>
                  <TableRow
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    className={
                      isGrantExpired(row.original.toBeUsedBy)
                        ? "bg-muted/30"
                        : undefined
                    }
                  >
                    {row.getVisibleCells().map((cell) => {
                      if (cell.column.id === "actions") {
                        return (
                          <TableCell key={cell.id}>
                            <div className="flex justify-end">
                              <RowActionsDropdown
                                label={`Actions for ${row.original.organization}`}
                                actions={
                                  row.original.dbId
                                    ? [
                                        {
                                          label: tCommon("viewDetails"),
                                          onClick: () =>
                                            onView(row.original.dbId!),
                                        },
                                        {
                                          label: tCommon("delete"),
                                          destructive: true,
                                          onClick: () =>
                                            setDeleteTarget({
                                              id: row.original.dbId!,
                                              name: row.original.organization,
                                            }),
                                        },
                                      ]
                                    : []
                                }
                              />
                            </div>
                          </TableCell>
                        );
                      }

                      return (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                  {row.getIsExpanded() &&
                    row.original.splits.map((part) => (
                      <TableRow
                        key={part.distributionId}
                        className="bg-muted/40 text-sm hover:bg-muted/40"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="py-1.5">
                            {splitPartCell(cell.column.id, part)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                </React.Fragment>
              ))
            ) : (
              <TableEmptyRow colCount={visibleColCount} />
            )}
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

/** The table, with the selected row's details panel beside it. */
export const GrantsTable = () => {
  const panel = useDetailPanel();
  return (
    <DetailSplit
      panel={
        panel.id !== null && (
          // keyed so switching rows starts the next record fresh
          <GrantPanel key={panel.id} id={panel.id} {...panel.controls} />
        )
      }
    >
      <GrantsTableContent onView={panel.open} />
    </DetailSplit>
  );
};
