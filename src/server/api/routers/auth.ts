import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { type EmailOtpType } from "@supabase/supabase-js";

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

        // Upsert Prisma user to link auth user with application user data
        const supabaseId = result.data?.user?.id ?? null;
        // derive a name from the email prefix if desired, otherwise leave empty
        const derivedName = email.split("@")[0];

        await prisma.user.upsert({
          where: { email },
          update: {
            name: derivedName,
            supabaseId: supabaseId ?? undefined,
            isConfirmed: !!result.data?.user?.email_confirmed_at,
            role: "Unassigned", // Default role enum value
          },
          create: {
            email,
            name: derivedName,
            supabaseId: supabaseId ?? undefined,
            password: "",
            role: "Unassigned", // Default role enum value
            isConfirmed: !!result.data?.user?.email_confirmed_at,
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

  confirmEmail: publicProcedure
    .input(
      z.object({
        token_hash: z.string(),
        type: z.enum(["signup", "email", "recovery", "email_change", "invite"]),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const supabase = await createClient();
        const { token_hash, type } = input;

        const result = await supabase.auth.verifyOtp({
          token_hash,
          type: type as EmailOtpType,
        });

        if (result.error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: result.error.message,
          });
        }

        // Update user's confirmation status in Prisma
        if (result.data.user?.email) {
          await prisma.user.update({
            where: { email: result.data.user.email },
            data: { isConfirmed: true },
          });
        }

        return { ok: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: message ?? "Failed to confirm email",
        });
      }
    }),
});
