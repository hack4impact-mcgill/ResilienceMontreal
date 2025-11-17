import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const testRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),
  // GET to http://localhost:3000/api/trpc/test.hello?batch=1&input={"0":{"json": {"text": "world"}}}

  you: protectedProcedure.query(async ({ ctx }) => {
    return {
      user: ctx.user ?? null,
    };
  }),
  // GET to http://localhost:3000/api/trpc/test.you?batch=1
});
