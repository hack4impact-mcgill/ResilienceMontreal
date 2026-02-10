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
          // Provide more specific error messages
          let errorMessage = result.error.message;
          
          if (errorMessage.toLowerCase().includes("invalid login credentials")) {
            errorMessage = "Invalid email or password. Please check your credentials and try again.";
          } else if (errorMessage.toLowerCase().includes("email not confirmed")) {
            errorMessage = "Please confirm your email before logging in.";
          } else if (errorMessage.toLowerCase().includes("user not found")) {
            errorMessage = "No account found with this email address.";
          }
          
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: errorMessage,
          });
        }
        // return the session so the client can ask the server to persist
        // the Supabase session cookies (Set-Cookie) in a separate route
        return { ok: true, session: result.data.session ?? null };
      } catch (err: unknown) {
        if (err instanceof TRPCError) {
          throw err;
        }
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

        // Check if user already exists in Prisma
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "An account with this email already exists. Please log in instead.",
          });
        }

        const result = await supabase.auth.signUp({ email, password });
        console.log("signUp result:", result);
        if (result.error) {
          // Provide more specific error messages
          let errorMessage = result.error.message;
          
          if (errorMessage.toLowerCase().includes("password")) {
            errorMessage = "Password must be at least 6 characters long and contain a mix of letters and numbers.";
          } else if (errorMessage.toLowerCase().includes("email")) {
            if (errorMessage.toLowerCase().includes("already registered")) {
              errorMessage = "This email is already registered. Please log in instead.";
            } else {
              errorMessage = "Please provide a valid email address.";
            }
          }
          
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: errorMessage,
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
            supabaseId: supabaseId || "",
            isConfirmed: !!result.data?.user?.email_confirmed_at,
            role: "Unassigned", // Default role enum value
          },
          create: {
            email,
            name: derivedName,
            supabaseId: supabaseId || "",
            role: "Unassigned", // Default role enum value
            isConfirmed: !!result.data?.user?.email_confirmed_at,
          },
        });

        return { ok: true };
      } catch (err: unknown) {
        if (err instanceof TRPCError) {
          throw err;
        }
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
