import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { createClient } from "~/utils/supabase/server";
import { getServerAuthSession } from "~/server/auth";

export const authRouter = createTRPCRouter({
  signIn: publicProcedure
    .input(z.object({ email: z.email(), password: z.string().min(6) }))
    .mutation(async ({ input }) => {
      try {
        const supabase = await createClient();
        const result = await supabase.auth.signInWithPassword(input);
        if (result.error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error.message,
          });
        }
        // return the session so the client can ask the server to persist
        // the Supabase session cookies (Set-Cookie) in a separate route
        return { ok: true, session: result.data.session ?? null };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: message ?? "Failed to sign in",
        });
      }
    }),

  signUp: publicProcedure
    .input(z.object({ email: z.email(), password: z.string().min(6) }))
    .mutation(async ({ input }) => {
      try {
        const supabase = await createClient();
        console.log("Signing up user:", input.email);
        const result = await supabase.auth.signUp(input);
        console.log("signUp result:", result);
        if (result.error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error.message,
          });
        }
        return { ok: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: message ?? "Failed to sign up",
        });
      }
    }),

  signOut: publicProcedure.mutation(async () => {
    try {
      const supabase = await createClient();
      const result = await supabase.auth.signOut();
      if (result.error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.error.message,
        });
      }
      return { ok: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: message ?? "Failed to sign out",
      });
    }
  }),

  getSession: publicProcedure.query(async () => {
    const session = await getServerAuthSession();
    return session;
  }),
});
