import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAppUrl } from "~/utils/app-url";
import { saveAuthorizationCode } from "~/server/google-drive";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const savedState = (await cookies()).get("google_drive_oauth_state")?.value;
  const done = new URL("/documents", getAppUrl());
  if (!state || state !== savedState || !code) {
    done.searchParams.set(
      "setupError",
      "Google authorization was cancelled or expired.",
    );
    return NextResponse.redirect(done);
  }
  try {
    await saveAuthorizationCode(
      code,
      `${getAppUrl()}/api/documents/google/callback`,
    );
    done.searchParams.set("connected", "1");
  } catch (error) {
    done.searchParams.set(
      "setupError",
      error instanceof Error
        ? error.message
        : "Could not connect Google Drive.",
    );
  }
  const response = NextResponse.redirect(done);
  response.cookies.delete("google_drive_oauth_state");
  return response;
}
