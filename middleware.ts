import { NextRequest, NextResponse } from "next/server";

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

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
