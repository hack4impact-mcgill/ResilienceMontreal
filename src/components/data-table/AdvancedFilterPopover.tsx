"use client";

import * as React from "react";
import { ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Props {
  title?: string;
  description?: string;
  hasApplied: boolean;
  hasPending: boolean;
  hasDraft: boolean;
  onApply: () => void;
  onClear: () => void;
  children: React.ReactNode;
}

export function AdvancedFilterPopover({
  title = "Filters",
  description,
  hasApplied,
  hasPending,
  hasDraft,
  onApply,
  onClear,
  children,
}: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "shrink-0 gap-2",
            hasApplied && "border-[#45BAB8] bg-[#45BAB8]/10",
          )}
        >
          <ListFilter className="h-4 w-4" aria-hidden />
          Filter
          {hasApplied && (
            <span
              className="flex h-2 w-2 rounded-full bg-[#45BAB8]"
              aria-hidden
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" side="bottom">
        <div className="border-b px-3 py-2">
          <p className="text-sm font-semibold">{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex flex-col gap-3 p-3">
          {children}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="gap-2 bg-[#45BAB8] hover:bg-[#45BAB8]/90"
              onClick={onApply}
              disabled={!hasPending}
            >
              Apply filters
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={onClear}
              disabled={!hasDraft && !hasApplied}
            >
              Clear filters
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
