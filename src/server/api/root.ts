import { testRouter } from "~/server/api/routers/test";
import { authRouter } from "~/server/api/routers/auth";
import { usersRouter } from "~/server/api/routers/users";
import { clientRouter } from "~/server/api/routers/client";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { fundPoolRouter } from "./routers/fundPool";
import { grantRouter } from "./routers/grant";
import { grantDistributionRouter } from "./routers/grantDistribution";
import { expensesRouter } from "~/server/api/routers/expenses";

// primary router for your server -- all routers added in /api/routers should be manually added here
export const appRouter = createTRPCRouter({
  test: testRouter,
  auth: authRouter,
  expenses: expensesRouter,
  users: usersRouter,
  fundPool: fundPoolRouter,
  grant: grantRouter,
  grantDistribution: grantDistributionRouter,
  client: clientRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

// create a server-side caller for the tRPC API -- for example:
// const trpc = createCaller(createContext);
// const res = await trpc.user.all(); (returns []User)
export const createCaller = createCallerFactory(appRouter);
