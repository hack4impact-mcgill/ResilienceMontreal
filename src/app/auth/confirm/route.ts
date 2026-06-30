import { type NextRequest, NextResponse } from "next/server";

import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;
  redirectTo.search = "";

  if (token_hash && type) {
    try {
      const headers = new Headers(request.headers);
      const ctx = await createTRPCContext({ headers });
      const caller = createCaller(ctx);

      await caller.auth.confirmEmail({
        token_hash,
        type: type as
          "signup" | "email" | "recovery" | "email_change" | "invite",
      });

      // redirect user to specified redirect URL or root of app
      return NextResponse.redirect(redirectTo);
    } catch (err) {
      console.error("Error confirming email:", err);
    }
  }
  // redirect the user to an error page with some instructions
  redirectTo.pathname = "/error";
  redirectTo.search = "";
  return NextResponse.redirect(redirectTo);
}
