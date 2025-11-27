import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { prisma } from "@/lib/prisma";

export const usersRouter = createTRPCRouter({
  // returns the current user's Prisma record (includes role)
  me: protectedProcedure.query(async ({ ctx }) => {
    const sessionUser = ctx.user;
    if (!sessionUser || !sessionUser.email) return null;

    const user = await prisma.user.findUnique({
      where: { email: sessionUser.email },
      include: { role: true },
    });

    return user;
  }),

  // list all users (admin-only)
  list: protectedProcedure.query(async ({ ctx }) => {
    // check admin
    const actor = await prisma.user.findUnique({
      where: { email: ctx.user?.email ?? undefined },
      include: { role: true },
    });
    if (!actor || actor.role?.name !== "Admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin required" });
    }

    return prisma.user.findMany({ include: { role: true } });
  }),

  // list available roles
  roles: protectedProcedure.query(async () => {
    return prisma.role.findMany();
  }),

  // set another user's role (admin-only)
  setRole: protectedProcedure
    .input(z.object({ userId: z.number(), roleId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const actor = await prisma.user.findUnique({
        where: { email: ctx.user?.email ?? undefined },
        include: { role: true },
      });
      if (!actor || actor.role?.name !== "Admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin required" });
      }

      if (actor.id === input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot change your own role",
        });
      }

      const role = await prisma.role.findUnique({
        where: { id: input.roleId },
      });
      if (!role)
        throw new TRPCError({ code: "NOT_FOUND", message: "Role not found" });

      const updated = await prisma.user.update({
        where: { id: input.userId },
        data: { roleId: role.id },
        include: { role: true },
      });

      return updated;
    }),
});

export type UsersRouter = typeof usersRouter;
