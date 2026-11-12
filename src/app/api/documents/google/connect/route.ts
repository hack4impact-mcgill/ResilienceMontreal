import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getAppUrl } from "~/utils/app-url";
import { getServerAuthSession } from "~/server/auth";
import { prisma } from "~/lib/prisma";
import { googleDriveAuthorizationUrl } from "~/server/google-drive";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerAuthSession();
  const user = session.user?.email
    ? await prisma.user.findUnique({ where: { email: session.user.email } })
    : null;
  if (user?.role !== "Admin")
    return NextResponse.redirect(new URL("/unauthorized", getAppUrl()));
  const state = randomBytes(32).toString("hex");
  const redirectUri = `${getAppUrl()}/api/documents/google/callback`;
  const response = NextResponse.redirect(
    googleDriveAuthorizationUrl(redirectUri, state),
  );
  response.cookies.set("google_drive_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
