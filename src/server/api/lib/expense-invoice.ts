import { TRPCError } from "@trpc/server";
import { invoiceFileName } from "~/lib/invoice-file-name";
import { validateInvoiceDriveFile } from "~/server/google-drive";

export async function resolveExpenseInvoice(
  input: { invoiceUrl?: string | null; invoiceDriveFileId?: string | null },
  validate = validateInvoiceDriveFile,
) {
  if (input.invoiceUrl && input.invoiceDriveFileId)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Choose either an invoice URL or a Drive file.",
    });
  const cleared = {
    invoiceDriveFileId: null,
    invoiceDriveFileName: null,
  };
  if (input.invoiceDriveFileId) {
    try {
      const file = await validate(input.invoiceDriveFileId);
      return {
        invoiceUrl: null,
        invoiceDriveFileId: file.id,
        invoiceDriveFileName: invoiceFileName(file),
      };
    } catch (error) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          error instanceof Error
            ? error.message
            : "Could not validate the Drive invoice.",
      });
    }
  }
  return {
    ...(input.invoiceUrl !== undefined ? { invoiceUrl: input.invoiceUrl } : {}),
    ...(input.invoiceUrl || input.invoiceDriveFileId === null ? cleared : {}),
  };
}
