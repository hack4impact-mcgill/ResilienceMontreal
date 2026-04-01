"use client";

import { FundPoolsDataTable } from "./fund-pools-data-table";

interface FundPoolsModalProps {
  open: boolean;
  onClose: () => void;
}

export function FundPoolsModal({ open, onClose }: FundPoolsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-[90vw] max-w-6xl max-h-[85vh] overflow-hidden shadow-xl flex flex-col">
        {/* Header */}
        <div className="p-8 pb-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl">Fund Pools</h1>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-8">
          <FundPoolsDataTable inModal={true} />
        </div>
      </div>
    </div>
  );
}
