"use client";

import * as React from "react";
import {
  ColumnDef,
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

import { CirclePlus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { api } from "~/trpc/react";

interface FundPoolWithAmount {
  id: number;
  category: string;
  totalAllocated: number;
  totalSpent: number;
  calculatedAmount: number;
  order: number;
}

// ------------------------------------------------------------
// ADD/EDIT FUND POOL MODAL
// ------------------------------------------------------------
function FundPoolFormModal({
  open,
  onClose,
  fundPool,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  fundPool?: FundPoolWithAmount;
  onSubmit: (data: { category: string }) => Promise<void>;
}) {
  if (!open) return null;

  return (
    <FundPoolFormModalContent
      key={fundPool?.id ?? "new"}
      fundPool={fundPool}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}

function FundPoolFormModalContent({
  onClose,
  fundPool,
  onSubmit,
}: {
  onClose: () => void;
  fundPool?: FundPoolWithAmount;
  onSubmit: (data: { category: string }) => Promise<void>;
}) {
  const [category, setCategory] = React.useState(fundPool?.category ?? "");
  const [error, setError] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const resetFields = () => {
    setCategory("");
    setError("");
  };

  const handleSubmit = async () => {
    const trimmedCategory = category.trim();
    if (!trimmedCategory) {
      setError("Category name is required");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await onSubmit({ category: trimmedCategory });
      resetFields();
      onClose();
    } catch (err) {
      setError("Failed to save fund pool");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-[400px] shadow-xl">
        <h2 className="text-xl font-semibold mb-4 text-center">
          {fundPool ? "Edit Fund Pool" : "Add Fund Pool"}
        </h2>

        <div className="space-y-3">
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category Name"
            disabled={isSubmitting}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => {
              resetFields();
              onClose();
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Submit"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// MAIN TABLE COMPONENT (FOR USE IN MODAL)
// ------------------------------------------------------------
interface FundPoolsDataTableProps {
  inModal?: boolean;
}

export const FundPoolsDataTable = ({
  inModal = false,
}: FundPoolsDataTableProps) => {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [selectedFundPool, setSelectedFundPool] =
    React.useState<FundPoolWithAmount | null>(null);

  const utils = api.useContext();

  // Queries
  const {
    data: fundPools = [],
    isLoading,
    isError,
  } = api.fundPool.getAll.useQuery();

  // Mutations
  const createMutation = api.fundPool.create.useMutation({
    onSuccess: () => {
      utils.fundPool.getAll.invalidate();
      utils.fundPool.getTotalFunding.invalidate();
      alert("Fund pool created successfully");
    },
    onError: (error) => {
      alert(error.message || "Failed to create fund pool");
    },
  });

  const updateMutation = api.fundPool.update.useMutation({
    onSuccess: () => {
      utils.fundPool.getAll.invalidate();
      alert("Fund pool updated successfully");
    },
    onError: (error) => {
      alert(error.message || "Failed to update fund pool");
    },
  });

  const deleteMutation = api.fundPool.delete.useMutation({
    onSuccess: () => {
      utils.fundPool.getAll.invalidate();
      utils.fundPool.getUncategorized.invalidate();
      utils.fundPool.getTotalFunding.invalidate();
      alert("Fund pool deleted successfully");
    },
    onError: (error) => {
      alert(error.message || "Failed to delete fund pool");
    },
  });

  const reorderMutation = api.fundPool.reorder.useMutation({
    onSuccess: () => {
      utils.fundPool.getAll.invalidate();
    },
    onError: (error) => {
      alert(error.message || "Failed to reorder fund pools");
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleCreate = async (data: { category: string }) => {
    await createMutation.mutateAsync({
      category: data.category,
    });
  };

  const handleUpdate = async (data: { category: string }) => {
    if (!selectedFundPool) return;

    await updateMutation.mutateAsync({
      id: selectedFundPool.id,
      category: data.category,
    });
  };

  const handleDelete = async (fundPool: FundPoolWithAmount) => {
    if (
      confirm(
        `Are you sure you want to delete "${fundPool.category}"? Any grants linked to this fund pool will be converted to uncategorized grants. This action cannot be undone.`,
      )
    ) {
      await deleteMutation.mutateAsync({
        id: fundPool.id,
      });
    }
  };

  const moveUp = (index: number) => {
    if (index > 0) {
      const newOrder = [...fundPools];
      [newOrder[index], newOrder[index - 1]] = [
        newOrder[index - 1],
        newOrder[index],
      ];
      reorderMutation.mutate({
        orderedIds: newOrder.map((item) => item.id),
      });
    }
  };

  const moveDown = (index: number) => {
    if (index < fundPools.length - 1) {
      const newOrder = [...fundPools];
      [newOrder[index], newOrder[index + 1]] = [
        newOrder[index + 1],
        newOrder[index],
      ];
      reorderMutation.mutate({
        orderedIds: newOrder.map((item) => item.id),
      });
    }
  };

  const columns: ColumnDef<FundPoolWithAmount>[] = [
    {
      accessorKey: "category",
      header: "CATEGORY",
      cell: (info) => info.getValue(),
    },
    {
      accessorKey: "totalAllocated",
      header: "ORIGINAL",
      cell: ({ row }) => formatCurrency(row.original.totalAllocated),
    },
    {
      accessorKey: "totalSpent",
      header: "SPENT",
      cell: ({ row }) => formatCurrency(row.original.totalSpent),
    },
    {
      accessorKey: "calculatedAmount",
      header: "REMAINING",
      cell: ({ row }) => formatCurrency(row.original.calculatedAmount),
    },
    {
      id: "order",
      header: "ORDER",
      cell: ({ row }) => {
        const index = fundPools.findIndex((fp) => fp.id === row.original.id);
        return (
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => moveUp(index)}
              disabled={index === 0}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => moveDown(index)}
              disabled={index === fundPools.length - 1}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "ACTIONS",
      enableHiding: false,
      cell: ({ row }) => {
        const fundPool = row.original;

        return (
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedFundPool(fundPool);
                setEditModalOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(fundPool)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable<FundPoolWithAmount>({
    data: fundPools,
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

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error loading data.</div>;

  const containerClass = inModal ? "w-full" : "w-full";
  const filterRowClass = inModal
    ? "border-t border-border flex items-center py-4"
    : "border-t border-border -mx-8 px-8 flex items-center py-4";
  const tableContainerClass = inModal ? "" : "-mx-8";
  const paginationClass = inModal
    ? "flex items-center justify-end space-x-2 py-4"
    : "flex items-center justify-end space-x-2 py-4 px-8";

  return (
    <div className={containerClass}>
      {/* Filter Row */}
      <div className={filterRowClass}>
        {/* Search Input */}
        <Input
          placeholder="Search by category..."
          value={
            (table.getColumn("category")?.getFilterValue() as string) ?? ""
          }
          onChange={(e) =>
            table.getColumn("category")?.setFilterValue(e.target.value)
          }
          className="max-w-sm"
        />

        {/* Add Fund Pool Button */}
        <Button
          variant="outline"
          className="ml-auto bg-[#45BAB8] text-white hover:bg-[#45BAB8]"
          onClick={() => setAddModalOpen(true)}
        >
          <CirclePlus /> Add Fund Pool
        </Button>
      </div>

      {/* Table */}
      <div className={tableContainerClass}>
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
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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
            ) : (
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
        </Table>
      </div>

      {/* Pagination */}
      <div className={paginationClass}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>

      {/* Add Fund Pool Modal */}
      <FundPoolFormModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmit={handleCreate}
      />

      {/* Edit Fund Pool Modal */}
      <FundPoolFormModal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedFundPool(null);
        }}
        fundPool={selectedFundPool ?? undefined}
        onSubmit={handleUpdate}
      />
    </div>
  );
};
