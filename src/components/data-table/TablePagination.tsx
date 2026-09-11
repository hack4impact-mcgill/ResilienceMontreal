"use client";

import { Button } from "@/components/ui/button";
import type { PaginationMeta } from "@/lib/data-table/types";

interface Props {
  pagination: PaginationMeta | undefined;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: 30 | 50 | 100) => void;
  limit: 30 | 50 | 100;
  disabled?: boolean;
}

export function TablePagination({
  pagination,
  onPageChange,
  onLimitChange,
  limit,
  disabled,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-4 px-8">
      <p className="text-sm text-muted-foreground">
        {pagination ? (
          <>
            Showing{" "}
            {pagination.totalCount === 0
              ? 0
              : (pagination.currentPage - 1) * pagination.pageSize + 1}
            –
            {(pagination.currentPage - 1) * pagination.pageSize +
              pagination.returnedCount}{" "}
            of {pagination.totalCount}
            {pagination.totalPages > 0
              ? ` · Page ${pagination.currentPage} of ${pagination.totalPages}`
              : null}
          </>
        ) : null}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onPageChange(Math.max(1, (pagination?.currentPage ?? 1) - 1))
          }
          disabled={disabled || !pagination?.hasPreviousPage}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange((pagination?.currentPage ?? 0) + 1)}
          disabled={disabled || !pagination?.hasNextPage}
        >
          Next
        </Button>
        <select
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value) as 30 | 50 | 100)}
          className="ml-2 h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value={30}>30</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
    </div>
  );
}
