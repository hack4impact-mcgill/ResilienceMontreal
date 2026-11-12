import { NextResponse } from "next/server";
import { getServerAuthSession } from "~/server/auth";
import { downloadDriveFile } from "~/server/google-drive";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getServerAuthSession();
  if (!session.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id)
    return NextResponse.json(
      { error: "Document id is required." },
      { status: 400 },
    );
  try {
    const { name, response: source } = await downloadDriveFile(id);
    const encodedName = encodeURIComponent(name).replace(
      /['()*]/g,
      (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
    );
    return new NextResponse(source.body, {
      headers: {
        "content-type":
          source.headers.get("content-type") ?? "application/octet-stream",
        "content-disposition": `attachment; filename*=UTF-8''${encodedName}`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Download failed." },
      { status: 400 },
    );
  }
}
