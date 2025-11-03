import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Only apply jitter to API routes in development
  if (
      request.nextUrl.pathname.startsWith("/api/") &&
      process.env.NODE_ENV === "development"
  ) {
    // Calculate random jitter between 100-500ms (hardcoded)
    const waitMs = Math.floor(Math.random() * 400) + 100;

    console.log(`Adding ${waitMs}ms jitter to ${request.nextUrl.pathname}`);

    // Add the jitter delay
    await new Promise((resolve) => setTimeout(resolve, waitMs));

    // Continue to the API route with jitter header
    const response = NextResponse.next();
    response.headers.set("X-Jitter-Added", waitMs.toString());
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
