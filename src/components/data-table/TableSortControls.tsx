"use client";

interface SortField<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  sortFields: SortField<T>[];
  sortBy: T;
  sortOrder: "asc" | "desc";
  onSortByChange: (v: T) => void;
  onSortOrderChange: (v: "asc" | "desc") => void;
}

export function TableSortControls<T extends string>({
  sortFields,
  sortBy,
  sortOrder,
  onSortByChange,
  onSortOrderChange,
}: Props<T>) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Sort by</label>
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as T)}
        >
          {sortFields.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Order</label>
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={sortOrder}
          onChange={(e) => onSortOrderChange(e.target.value as "asc" | "desc")}
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>
    </div>
  );
}
