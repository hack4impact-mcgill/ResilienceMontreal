# Data Table Utilities

Shared hooks, components, and utilities for server-paginated tables.

---

## File layout

```
src/
  lib/data-table/
    types.ts          PaginationMeta interface
    export-csv.ts     exportToCSV()
    group-rows.ts     groupRows()
  hooks/
    use-server-table-state.ts
    use-advanced-filters.ts
    use-table-form.ts
  components/data-table/
    DataTable.tsx
    TablePagination.tsx
    TableSortControls.tsx
    FetchingOverlay.tsx
    TableEmptyRow.tsx
    TableLoadingState.tsx
    TableErrorState.tsx
    DeleteConfirmDialog.tsx
    RowActionsDropdown.tsx
    AdvancedFilterPopover.tsx
    InlineFormRow.tsx
```

---

## Hooks

### `useServerTableState<TSortBy extends string>(options)`

Manages page, limit, sortBy, sortOrder, and draft/applied search state.

```ts
const tableState = useServerTableState<"date" | "totalAmount">({
  defaultSortBy: "date",
  defaultSortOrder: "desc", // optional, default "desc"
  defaultLimit: 30, // optional, default 30
});

// Use in query:
api.expenses.list.useQuery({
  page: tableState.page,
  limit: tableState.limit,
  sortBy: tableState.sortBy,
  sortOrder: tableState.sortOrder,
  description: tableState.appliedSearch,
});

// UI:
tableState.setDraftSearch(value);
tableState.commitSearch(); // sets appliedSearch and resets to page 1
tableState.clearSearch();
tableState.setPage(n);
tableState.setLimit(50); // also resets to page 1
tableState.setSortBy("date"); // also resets to page 1
tableState.setSortOrder("asc");
```

### `useAdvancedFilters<TFilters>(empty)`

Manages draft vs applied filter state. Filters are only sent to the API when `apply()` is called.

```ts
const filters = useAdvancedFilters({
  minAmount: "",
  maxAmount: "",
  dateFrom: "",
  dateTo: "",
});

// Read draft in inputs:
filters.draft.minAmount;

// Update draft (partial):
filters.setDraft({ minAmount: "100" });

// Commit to applied (triggers query):
filters.apply();
filters.clear();

// State booleans:
filters.hasApplied; // any applied filter is non-empty
filters.hasPending; // draft differs from applied
```

### `useTableForm<TFormData>(empty)`

Manages inline add form state and Zod validation.

```ts
const form = useTableForm<ExpenseFormData>({
  description: "",
  date: "",
  totalAmount: "",
  fundPoolId: "",
  invoiceUrl: "",
});

form.isAdding;
form.formData;
form.formErrors;
form.setFormData({ description: "..." });
form.openForm();
form.closeForm(); // resets and closes
form.resetForm(); // resets without closing
form.validateForm(schema); // returns boolean, populates formErrors
```

---

## Components

### `DataTable<TRow>`

Generic table shell. Renders header, body, optional toolbar, and pagination.

```tsx
<DataTable
  columns={columns}
  data={rows}
  isFetching={isFetching}
  pagination={pagination}
  limit={tableState.limit}
  onPageChange={tableState.setPage}
  onLimitChange={tableState.setLimit}
  toolbar={<> {/* search, sort, export buttons */} </>}
  inlineFormRows={isAdding ? <InlineFormRow ...> ... </InlineFormRow> : undefined}
  rowClassName={(row) => row.isExpired ? "bg-muted/30" : undefined}
  emptyMessage="No grants found."
  // Column visibility (future use):
  columnVisibility={columnVisibility}
  onColumnVisibilityChange={setColumnVisibility}
  // Optional grouping:
  groupBy={(row) => row.category}
/>
```

### `TablePagination`

```tsx
<TablePagination
  pagination={pagination} // PaginationMeta | undefined
  limit={tableState.limit}
  onPageChange={tableState.setPage}
  onLimitChange={tableState.setLimit}
  disabled={isEditing} // optional
/>
```

### `TableSortControls<TSortBy>`

```tsx
<TableSortControls
  sortFields={[
    { value: "date", label: "Date" },
    { value: "totalAmount", label: "Amount" },
  ]}
  sortBy={tableState.sortBy}
  sortOrder={tableState.sortOrder}
  onSortByChange={tableState.setSortBy}
  onSortOrderChange={tableState.setSortOrder}
/>
```

### `AdvancedFilterPopover`

Composable popover. Pass filter inputs as `children`.

```tsx
<AdvancedFilterPopover
  description="Amount range and date range."
  hasApplied={filters.hasApplied}
  hasPending={filters.hasPending}
  hasDraft={Boolean(filters.draft.minAmount || filters.draft.dateFrom)}
  onApply={() => { filters.apply(); tableState.setPage(1); }}
  onClear={filters.clear}
>
  <div className="grid grid-cols-2 gap-3">
    <Input value={filters.draft.minAmount} onChange={...} />
    <Input value={filters.draft.maxAmount} onChange={...} />
  </div>
</AdvancedFilterPopover>
```

### `InlineFormRow`

Wraps the highlighted add/edit row and the action buttons row below it.

```tsx
<InlineFormRow
  colCount={columns.length}
  onSave={() => handleSave(false)}
  onSaveAndAddMore={() => handleSave(true)} // optional
  onCancel={form.closeForm}
  isSaving={mutation.isPending}
  error={mutation.error?.message}
  className="bg-[#D1EDED] hover:bg-[#D1EDED]" // optional
>
  <TableCell>...</TableCell>
  {/* one TableCell per column */}
</InlineFormRow>
```

### `DeleteConfirmDialog`

Replaces `window.confirm`.

```tsx
<DeleteConfirmDialog
  open={deleteTargetId !== null}
  entityName="this client"
  onConfirm={confirmDelete}
  onCancel={() => setDeleteTargetId(null)}
/>
```

### `RowActionsDropdown`

```tsx
<RowActionsDropdown
  label="Actions for Jane Doe"
  actions={[
    { label: "Edit client", onClick: () => startEdit(client) },
    {
      label: "Delete client",
      onClick: () => setDeleteTargetId(client.id),
      destructive: true,
    },
  ]}
/>
```

---

## Utilities

### `exportToCSV(headers, rows, filePrefix)`

```ts
exportToCSV(
  ["Description", "Date", "Amount"],
  expenses.map((e) => [
    e.description,
    e.date.toLocaleDateString(),
    e.totalAmount.toFixed(2),
  ]),
  "expense_list",
);
// Downloads: expense_list_9-11-26.csv
```

### `groupRows(rows, keyFn)`

```ts
const groups = groupRows(expenses, (e) => e.fundPoolCategory || "Unassigned");
// returns [{ key: "Housing", rows: [...] }, { key: "Food", rows: [...] }]
```

> **Limitation**: grouping operates on the current page only. If rows from the same group span multiple pages the group will appear incomplete on each page. A server-side `GROUP BY` endpoint would be needed for cross-page completeness.

---

## How to add a new server-paginated table

1. **Backend**: ensure the tRPC query returns `pagination: PaginationMeta` (same shape as Grants/Expenses).

2. **Types**: define a row type (e.g. `export type MyEntity = { ... }`) and `ColumnDef<MyEntity>[]` in `columns.tsx`.

3. **State hooks** in the table component:

```ts
const tableState = useServerTableState<MySortBy>({
  defaultSortBy: "createdAt",
});
const filters = useAdvancedFilters({ field1: "", field2: "" });
const form = useTableForm<MyFormData>(EMPTY_FORM);
```

4. **Query**:

```ts
const { data, isFetching } = api.myRouter.list.useQuery({
  page: tableState.page,
  limit: tableState.limit,
  sortBy: tableState.sortBy,
  sortOrder: tableState.sortOrder,
  search: tableState.appliedSearch,
  ...mapFilters(filters.applied),
});
```

5. **Reset page when applied filters change**:

```ts
React.useEffect(() => {
  tableState.setPage(1);
}, [filters.applied.field1, filters.applied.field2]);
```

6. **Render** using `DataTable` (or manually with the sub-components for tables with complex inline edit UX like Grants).

7. **Mutations**: use React Query `onMutate`/`onError`/`onSettled` for optimistic deletes (see `GrantsTable` for the pattern).
