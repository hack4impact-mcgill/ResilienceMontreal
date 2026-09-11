"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  OnChangeFn,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import type { PaginationMeta } from "@/lib/data-table/types";
import { FetchingOverlay } from "./FetchingOverlay";
import { TableEmptyRow } from "./TableEmptyRow";
import { TablePagination } from "./TablePagination";

interface Props<TRow> {
  columns: ColumnDef<TRow>[];
  data: TRow[];
  isFetching?: boolean;
  pagination?: PaginationMeta;
  limit?: 30 | 50 | 100;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: 30 | 50 | 100) => void;
  toolbar?: React.ReactNode;
  inlineFormRows?: React.ReactNode;
  rowClassName?: (row: TRow) => string | undefined;
  emptyMessage?: string;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
}

export function DataTable<TRow>({
  columns,
  data,
  isFetching,
  pagination,
  limit = 30,
  onPageChange,
  onLimitChange,
  toolbar,
  inlineFormRows,
  rowClassName,
  emptyMessage,
  columnVisibility,
  onColumnVisibilityChange,
}: Props<TRow>) {
  const table = useReactTable<TRow>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...(columnVisibility !== undefined && {
      state: { columnVisibility },
      onColumnVisibilityChange,
    }),
  });

  return (
    <div className="relative w-full">
      {isFetching && <FetchingOverlay />}

      {toolbar && (
        <div className="border-t border-border -mx-8 px-8 flex flex-col gap-3 py-4">
          {toolbar}
        </div>
      )}

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
            {inlineFormRows}
            {table.getRowModel().rows.length > 0
              ? table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={rowClassName?.(row.original)}
                  >
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
              : !inlineFormRows && (
                  <TableEmptyRow
                    colCount={columns.length}
                    message={emptyMessage}
                  />
                )}
          </TableBody>

          <TableFooter />
        </Table>
      </div>

      {pagination && onPageChange && onLimitChange && (
        <TablePagination
          pagination={pagination}
          limit={limit}
          onPageChange={onPageChange}
          onLimitChange={onLimitChange}
        />
      )}
    </div>
  );
}
