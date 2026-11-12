import { NextResponse } from "next/server";
import { getServerAuthSession } from "~/server/auth";
import { uploadDriveFile } from "~/server/google-drive";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getServerAuthSession();
  if (!session.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    const parentId = form.get("parentId");
    if (!(file instanceof File))
      return NextResponse.json(
        { error: "Choose a file to upload." },
        { status: 400 },
      );
    if (file.size > 25 * 1024 * 1024)
      return NextResponse.json(
        { error: "Files must be 25 MB or smaller." },
        { status: 400 },
      );
    const uploaded = await uploadDriveFile(
      file,
      typeof parentId === "string" && parentId ? parentId : undefined,
    );
    return NextResponse.json(uploaded);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 400 },
    );
  }
}
