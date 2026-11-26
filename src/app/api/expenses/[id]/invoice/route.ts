import { NextResponse } from "next/server";
import { getServerAuthSession } from "~/server/auth";
import { db } from "~/server/db";
import {
  downloadDriveFile,
  validateInvoiceDriveFile,
} from "~/server/google-drive";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerAuthSession();
  // Matches expenses.list: all authenticated users can view invoices.
  if (!session.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)))
    return NextResponse.json({ error: "Invalid expense ID" }, { status: 400 });
  const expense = await db.expense.findUnique({
    where: { id: Number(id) },
    select: { invoiceDriveFileId: true },
  });
  if (!expense?.invoiceDriveFileId)
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  try {
    const file = await validateInvoiceDriveFile(expense.invoiceDriveFileId);
    const { response: source } = await downloadDriveFile(file.id);
    // Only inert formats are rendered on the app origin; SVG/HTML always download.
    const inline =
      new URL(request.url).searchParams.get("download") !== "1" &&
      /^(application\/pdf|image\/(png|jpeg|gif|webp|avif))$/.test(
        file.mimeType,
      );
    const filename = encodeURIComponent(file.name).replace(
      /['()*]/g,
      (c) => `%${c.charCodeAt(0).toString(16)}`,
    );
    return new NextResponse(source.body, {
      headers: {
        "content-type": file.mimeType,
        "content-disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${filename}`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
        "content-security-policy": "sandbox",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "This invoice is unavailable. It may have moved or the shared Drive connection may need reconnecting.",
      },
      { status: 400 },
    );
  }
}
