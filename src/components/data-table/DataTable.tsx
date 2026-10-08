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
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { PaginationMeta } from "@/lib/data-table/types";
import { groupRows } from "@/lib/data-table/group-rows";
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
  groupBy?: (row: TRow) => string;
  /** When set, clicking a row navigates to the returned path. */
  getRowHref?: (row: TRow) => string;
}

// Clicks on links, buttons and inputs inside a row keep their own behaviour.
const INTERACTIVE_SELECTOR = "a, button, input, select, textarea, [role=menu]";

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
  groupBy,
  getRowHref,
}: Props<TRow>) {
  const router = useRouter();

  const rowLinkProps = (row: TRow) => {
    if (!getRowHref) return { className: rowClassName?.(row) };
    const href = getRowHref(row);
    return {
      className: cn("cursor-pointer", rowClassName?.(row)),
      tabIndex: 0,
      role: "link",
      onClick: (e: React.MouseEvent<HTMLTableRowElement>) => {
        if ((e.target as HTMLElement).closest(INTERACTIVE_SELECTOR)) return;
        router.push(href);
      },
      onKeyDown: (e: React.KeyboardEvent<HTMLTableRowElement>) => {
        if (e.key === "Enter" && e.target === e.currentTarget) {
          router.push(href);
        }
      },
    };
  };
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
              ? groupBy
                ? groupRows(table.getRowModel().rows, (r) =>
                    groupBy(r.original),
                  ).map(({ key, rows: groupedRows }) => (
                    <React.Fragment key={key}>
                      <TableRow className="bg-muted/50">
                        <TableCell
                          colSpan={columns.length}
                          className="py-1 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                        >
                          {key}
                        </TableCell>
                      </TableRow>
                      {groupedRows.map((row) => (
                        <TableRow key={row.id} {...rowLinkProps(row.original)}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))
                : table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} {...rowLinkProps(row.original)}>
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
