import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { env } from "~/env";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
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

          if (
            errorMessage.toLowerCase().includes("invalid login credentials")
          ) {
            errorMessage =
              "Invalid email or password. Please check your credentials and try again.";
          } else if (
            errorMessage.toLowerCase().includes("email not confirmed")
          ) {
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
    .input(z.object({ email: z.string(), password: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const { email, password } = input;
        const supabase = await createClient();
        console.log("Signing up user:", email);

        // Validate email format first
        const emailSchema = z.string().email();
        const emailValidation = emailSchema.safeParse(email);
        if (!emailValidation.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Please provide a valid email address.",
          });
        }

        // Check if user already exists in Prisma BEFORE validating password
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "An account with this email already exists. Please log in instead.",
          });
        }

        // Now validate password
        if (password.length < 6) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Password must be at least 6 characters long.",
          });
        }

        const result = await supabase.auth.signUp({ email, password });
        console.log("signUp result:", result);
        if (result.error) {
          // Provide more specific error messages
          let errorMessage = result.error.message;

          if (errorMessage.toLowerCase().includes("password")) {
            errorMessage =
              "Password must be at least 6 characters long and contain a mix of letters and numbers.";
          } else if (errorMessage.toLowerCase().includes("email")) {
            if (errorMessage.toLowerCase().includes("already registered")) {
              errorMessage =
                "This email is already registered. Please log in instead.";
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

  forgotPassword: publicProcedure
    .input(z.object({ email: z.email() }))
    .mutation(async ({ input }) => {
      try {
        const supabase = await createClient();

        const redirectTo = `${env.NEXT_PUBLIC_APP_URL}/update-password`;

        const { error } = await supabase.auth.resetPasswordForEmail(
          input.email,
          { redirectTo },
        );

        if (error) {
          console.error("resetPasswordForEmail error (tRPC):", error);
        }

        return {
          ok: true,
          message:
            "If an account exists for this email, we’ve sent a password reset link.",
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: message ?? "Failed to start password reset",
        });
      }
    }),

  updatePassword: protectedProcedure
    .input(z.object({ password: z.string().min(6) }))
    .mutation(async ({ input }) => {
      try {
        const supabase = await createClient();

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("getUser error in tRPC updatePassword:", userError);
        }

        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message:
              "This link is invalid or has expired. Please request a new one.",
          });
        }

        const { error: updateError } = await supabase.auth.updateUser({
          password: input.password,
        });

        if (updateError) {
          console.error(
            "updateUser error in tRPC updatePassword:",
            updateError,
          );
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              updateError.message ??
              "Failed to update password. Please try again.",
          });
        }

        // Sign out the user to clear the session and redirect to login page
        await supabase.auth.signOut();

        return {
          ok: true,
          message: "Your password has been updated successfully.",
        };
      } catch (err: unknown) {
        if (err instanceof TRPCError) {
          throw err;
        }
        const message = err instanceof Error ? err.message : String(err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: message ?? "Failed to update password",
        });
      }
    }),
});
