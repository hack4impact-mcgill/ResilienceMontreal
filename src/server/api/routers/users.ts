import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { RoleName } from "@prisma/client";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { prisma } from "@/lib/prisma";

export const usersRouter = createTRPCRouter({
  // returns the current user's Prisma record (includes role)
  me: protectedProcedure.query(async ({ ctx }) => {
    const sessionUser = ctx.user;
    if (!sessionUser || !sessionUser.email) return null;

    const user = await prisma.user.findUnique({
      where: { email: sessionUser.email },
    });

    return user;
  }),

  // list all users (admin-only)
  list: protectedProcedure.query(async ({ ctx }) => {
    // check admin
    const actor = await prisma.user.findUnique({
      where: { email: ctx.user?.email ?? undefined },
    });
    if (!actor || actor.role !== "Admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin required" });
    }

    return prisma.user.findMany();
  }),

  // list available roles (returns enum values)
  roles: protectedProcedure.query(async () => {
    // Return the RoleName enum values
    return Object.values(RoleName).map((name) => ({ name }));
  }),

  // set another user's role (admin-only)
  setRole: protectedProcedure
    .input(z.object({ userId: z.string(), role: z.nativeEnum(RoleName) }))
    .mutation(async ({ input, ctx }) => {
      const actor = await prisma.user.findUnique({
        where: { email: ctx.user?.email ?? undefined },
      });
      if (!actor || actor.role !== "Admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin required" });
      }

      // Prevent changing own role
      if (actor.supabaseId === input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot change your own role",
        });
      }

      // Get the target user to check if they're currently an Admin
      const targetUser = await prisma.user.findUnique({
        where: { supabaseId: input.userId },
      });

      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // If demoting an admin, check if they're the last admin
      if (targetUser.role === "Admin" && input.role !== "Admin") {
        const adminCount = await prisma.user.count({
          where: { role: "Admin" },
        });

        if (adminCount <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Cannot remove the last admin. Please promote another user to Admin first.",
          });
        }
      }

      const updated = await prisma.user.update({
        where: { supabaseId: input.userId },
        data: { role: input.role },
      });

      return updated;
    }),
});

export type UsersRouter = typeof usersRouter;