import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { createClient } from "~/utils/supabase/server";
import { getServerAuthSession } from "~/server/auth";
import { prisma } from "@/lib/prisma";

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
        const { email, password } = input;
        const supabase = await createClient();
        console.log("Signing up user:", email);

        const result = await supabase.auth.signUp({ email, password });
        console.log("signUp result:", result);
        if (result.error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error.message,
          });
        }

        // Find default role (Unassigned)
        const defaultRole = await prisma.role.findUnique({ where: { name: "Unassigned" } });

        // Upsert Prisma user to link auth user with application user data
        const supabaseId = result.data?.user?.id ?? null;
        // derive a name from the email prefix if desired, otherwise leave empty
        const derivedName = email.split("@")[0];

        await prisma.user.upsert({
          where: { email },
          update: {
            name: derivedName,
            supabaseId: supabaseId ?? undefined,
            isConfirmed: (result.data?.user as any)?.email_confirmed ?? false,
            roleId: defaultRole?.id ?? undefined,
          },
          create: {
            email,
            name: derivedName,
            supabaseId: supabaseId ?? undefined,
            password: "",
            roleId: defaultRole?.id ?? undefined,
            isConfirmed: (result.data?.user as any)?.email_confirmed ?? false,
          },
        });

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
