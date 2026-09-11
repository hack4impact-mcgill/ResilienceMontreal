"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";

interface Props {
  colCount: number;
  children: React.ReactNode;
  onSave: () => void;
  onSaveAndAddMore?: () => void;
  onCancel: () => void;
  isSaving?: boolean;
  className?: string;
  error?: string | null;
}

export function InlineFormRow({
  colCount,
  children,
  onSave,
  onSaveAndAddMore,
  onCancel,
  isSaving,
  className = "bg-[#D1EDED] hover:bg-[#D1EDED]",
  error,
}: Props) {
  return (
    <>
      <TableRow className={className}>{children}</TableRow>

      {error && (
        <TableRow className={className}>
          <TableCell colSpan={colCount} className="py-2 px-20">
            <p className="text-sm text-red-600">{error}</p>
          </TableCell>
        </TableRow>
      )}

      <TableRow className={className}>
        <TableCell colSpan={colCount} className="py-4 px-20">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className="bg-[#45BAB8] text-white hover:bg-[#45BAB8]"
            >
              {isSaving ? "Saving…" : "Save"}
            </Button>
            {onSaveAndAddMore && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSaveAndAddMore}
                disabled={isSaving}
                className="bg-[#45BAB8] text-white hover:bg-[#45BAB8]"
              >
                {isSaving ? "Saving…" : "Save & Add More"}
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    </>
  );
}
