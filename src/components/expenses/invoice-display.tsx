"use client";

import { type ReactNode } from "react";
import { Download } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

const linkClass =
  "rounded text-[#247575] underline underline-offset-4 hover:text-[#1c5c5c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function InvoiceDisplay({
  expense,
  urlLabel = "Open invoice",
  showDownload = true,
}: {
  expense: {
    id: number;
    invoiceUrl: string | null;
    invoiceDriveFileId: string | null;
    invoiceDriveFileName: string | null;
  };
  urlLabel?: ReactNode;
  showDownload?: boolean;
}) {
  if (expense.invoiceDriveFileId) {
    const href = `/api/expenses/${expense.id}/invoice`;
    return (
      <div className="flex min-w-0 items-center gap-1">
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${expense.invoiceDriveFileName ?? "invoice"}`}
          className={`${linkClass} break-all`}
        >
          {expense.invoiceDriveFileName ?? "Invoice"}
        </a>
        {showDownload && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={`${href}?download=1`}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded text-[#247575] hover:bg-[#3FA9A9]/10 hover:text-[#1c5c5c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Download ${expense.invoiceDriveFileName ?? "invoice"}`}
                >
                  <Download aria-hidden="true" className="size-4" />
                </a>
              </TooltipTrigger>
              <TooltipContent>Download invoice</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }
  return expense.invoiceUrl ? (
    <a
      className={linkClass}
      href={expense.invoiceUrl}
      target="_blank"
      rel="noreferrer"
    >
      {urlLabel}
    </a>
  ) : (
    <>—</>
  );
}
