import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { env } from "~/env";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  try {
    const headers = new Headers(req.headers as any);
    return createTRPCContext({ headers });
  } catch (err) {
    console.error("tRPC createContext failed:", err);
    throw err;
  }
};

const handler = async (req: NextRequest) => {
  try {
    return await fetchRequestHandler({
      endpoint: "/api/trpc",
      req,
      router: appRouter,
      createContext: () => createContext(req),
      onError:
        env.NODE_ENV === "development"
          ? ({ path, error }) => {
              console.error(
                `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`
              );
            }
          : undefined,
    });
  } catch (err) {
    console.error("handleTrpcRequest error:", err);
    throw err;
  }
};

export { handler as GET, handler as POST };
