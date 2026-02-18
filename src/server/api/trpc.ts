import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { db } from "~/server/db";
import { getServerAuthSession } from "~/server/auth";
// allow you to access things when processing a request, like the database, the session, etc.
// this helper generates the "internals" for a tRPC context
// the API handler and RSC clients each wrap this and provides the required context (https://trpc.io/docs/server/context)
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await getServerAuthSession();

  return {
    db,
    user: session.user ?? null,
    ...opts,
  };
};

// INITIALIZATION
// tRPC API is initialized, connecting the context and transformer
// ZodErrors also get parsed for typesafety on the frontend if your procedure fails due to validation errors on the backend
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// create a server-side caller (https://trpc.io/docs/server/server-side-calls)
export const createCallerFactory = t.createCallerFactory;

// ROUTER & PROCEDURE
// these are the pieces you use to build the tRPC API -- you should import these a lot in the "/src/server/api/routers" directory

// create new routers and sub-routers in the tRPC API (https://trpc.io/docs/router)
export const createTRPCRouter = t.router;

// middleware for timing procedure execution and adding an artificial delay in dev
// helps catch unwanted waterfalls by simulating network latency that would occur in prod but not in dev
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

export const publicProcedure = t.procedure.use(timingMiddleware);

export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    // require an authenticated user
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        // downstream handlers can rely on ctx.user being present
        user: ctx.user,
      },
    });
  });

// interventionTeamProcedure requires the user to be an InterventionTeam member or Admin
// used for protecting client-related operations
export const interventionTeamProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    const user = await ctx.db.user.findUnique({
      where: { email: ctx.user.email ?? undefined },
    });

    if (!user || (user.role !== "InterventionTeam" && user.role !== "Admin")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only Intervention Team members can access client data",
      });
    }

    return next({
      ctx: {
        ...ctx,
        userRole: user.role,
      },
    });
  }
);
