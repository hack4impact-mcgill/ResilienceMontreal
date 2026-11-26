"use client";

import { useId, useState } from "react";
import { FolderOpen, RefreshCw, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { DocumentsBrowser } from "~/components/documents/documents-browser";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

export type InvoiceDraft = {
  invoiceUrl: string;
  invoiceDriveFileId: string | null;
  invoiceDriveFileName: string | null;
};

export function InvoiceInput({
  value,
  onChange,
}: {
  value: InvoiceDraft;
  onChange: (value: InvoiceDraft) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"url" | "drive">(
    value.invoiceDriveFileId ? "drive" : "url",
  );
  const modeId = useId();
  return (
    <div className="w-56 min-w-0 max-w-full space-y-2">
      {mode === "url" ? (
        <>
          <Input
            className="h-9 w-full border-[#3FA9A9] bg-white"
            aria-label="Invoice URL"
            type="url"
            placeholder="Invoice URL (optional)"
            value={value.invoiceUrl}
            onChange={(e) =>
              onChange({
                ...value,
                invoiceUrl: e.target.value,
                ...(e.target.value.trim()
                  ? { invoiceDriveFileId: null, invoiceDriveFileName: null }
                  : {}),
              })
            }
          />
        </>
      ) : (
        <>
          <Dialog open={open} onOpenChange={setOpen}>
            {value.invoiceDriveFileId ? (
              <TooltipProvider delayDuration={200}>
                <div className="flex h-9 w-full min-w-0 items-center rounded-md border border-[#3FA9A9] bg-white pl-3 pr-0.5 shadow-sm">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        tabIndex={0}
                        className="min-w-0 flex-1 truncate rounded text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {value.invoiceDriveFileName ?? "Invoice"}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs break-words">
                      {value.invoiceDriveFileName ?? "Invoice"}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Replace invoice"
                          className="size-8 shrink-0 text-[#247575] hover:bg-[#3FA9A9]/10 hover:text-[#247575]"
                        >
                          <RefreshCw aria-hidden="true" />
                        </Button>
                      </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Replace invoice</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove invoice"
                        className="size-8 shrink-0 text-muted-foreground"
                        onClick={() =>
                          onChange({
                            ...value,
                            invoiceDriveFileId: null,
                            invoiceDriveFileName: null,
                          })
                        }
                      >
                        <X aria-hidden="true" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remove invoice</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            ) : (
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 w-full border-[#3FA9A9]/50 bg-white text-[#247575] hover:bg-[#3FA9A9]/10 hover:text-[#247575]"
                >
                  <FolderOpen aria-hidden="true" />
                  Choose file
                </Button>
              </DialogTrigger>
            )}
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Choose an invoice from Drive</DialogTitle>
                <DialogDescription>
                  Select one downloadable file from the organization’s linked
                  folder. Saving the expense will attach it.
                </DialogDescription>
              </DialogHeader>
              {open && (
                <DocumentsBrowser
                  onSelect={(file) => {
                    onChange({
                      invoiceUrl: "",
                      invoiceDriveFileId: file.id,
                      invoiceDriveFileName: file.name,
                    });
                    setOpen(false);
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
          {value.invoiceUrl && (
            <p className="text-xs text-muted-foreground">
              Your invoice URL will be kept until you select a file.
            </p>
          )}
        </>
      )}
      <fieldset className="flex w-full rounded-md border border-[#3FA9A9]/40 bg-white p-0.5">
        <legend className="sr-only">Invoice source</legend>
        {(
          [
            { id: "url", label: "URL" },
            { id: "drive", label: "Google Drive" },
          ] as const
        ).map((option) => (
          <label
            key={option.id}
            className="min-w-0 flex-1 cursor-pointer text-center"
          >
            <input
              type="radio"
              name={modeId}
              value={option.id}
              checked={mode === option.id}
              onChange={() => setMode(option.id)}
              className="peer sr-only"
            />
            <span className="block rounded px-3 py-1 text-xs font-medium text-muted-foreground peer-checked:bg-[#3FA9A9]/15 peer-checked:text-[#247575] peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
              {option.label}
            </span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}
