"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { FundPoolForm } from "./fund-pool-form";
import { FundPoolTable } from "./fund-pool-table";

interface FundPoolModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ModalMode = "view" | "create" | "edit";

interface FundPoolWithAmount {
  id: number;
  category: string;
  calculatedAmount: number;
  order: number;
}

export function FundPoolModal({ open, onOpenChange }: FundPoolModalProps) {
  const [mode, setMode] = useState<ModalMode>("view");
  const [selectedFundPool, setSelectedFundPool] =
    useState<FundPoolWithAmount | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const utils = api.useContext();

  // Queries
  const { data: fundPools = [], isLoading } = api.fundPool.getAll.useQuery(
    undefined,
    {
      enabled: open,
    },
  );

  // Mutations
  const createMutation = api.fundPool.create.useMutation({
    onSuccess: () => {
      utils.fundPool.getAll.invalidate();
      utils.fundPool.getTotalFunding.invalidate();
      setMode("view");
      alert("Fund pool created successfully");
    },
    onError: (error) => {
      alert(error.message || "Failed to create fund pool");
    },
  });

  const updateMutation = api.fundPool.update.useMutation({
    onSuccess: () => {
      utils.fundPool.getAll.invalidate();
      setMode("view");
      setSelectedFundPool(null);
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
      alert("Fund pools reordered successfully");
    },
    onError: (error) => {
      alert(error.message || "Failed to reorder fund pools");
    },
  });

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

  const handleEdit = (fundPool: FundPoolWithAmount) => {
    setSelectedFundPool(fundPool);
    setMode("edit");
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

  const handleReorder = async (orderedIds: number[]) => {
    await reorderMutation.mutateAsync({
      orderedIds,
    });
  };

  const handleCancel = () => {
    setMode("view");
    setSelectedFundPool(null);
  };

  const handleModalClose = (open: boolean) => {
    if (!open) {
      setMode("view");
      setSelectedFundPool(null);
      setSearchQuery("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleModalClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "view" && "Manage Fund Pools"}
            {mode === "create" && "Create Fund Pool"}
            {mode === "edit" && "Edit Fund Pool"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {mode === "view" && (
            <>
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {fundPools.length} fund pool
                  {fundPools.length !== 1 ? "s" : ""}
                </div>
                <Button onClick={() => setMode("create")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Fund Pool
                </Button>
              </div>

              <FundPoolTable
                fundPools={fundPools}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onReorder={handleReorder}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </>
          )}

          {mode === "create" && (
            <FundPoolForm
              onSubmit={handleCreate}
              onCancel={handleCancel}
              isLoading={createMutation.isPending}
            />
          )}

          {mode === "edit" && selectedFundPool && (
            <FundPoolForm
              fundPool={selectedFundPool}
              onSubmit={handleUpdate}
              onCancel={handleCancel}
              isLoading={updateMutation.isPending}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
