import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, interventionTeamProcedure } from "~/server/api/trpc";

export const clientRouter = createTRPCRouter({
  addClient: interventionTeamProcedure
    .input(
      z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        dateOfBirth: z.date(),
        workerId: z.string(),
        email: z.email().optional().nullable(),
        phone: z.string().optional().nullable(),
        landlordName: z.string().optional().nullable(),
        leaseStart: z.date().optional().nullable(),
        leaseEnd: z.date().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const client = await ctx.db.client.create({
          data: {
            firstName: input.firstName,
            lastName: input.lastName,
            dateOfBirth: input.dateOfBirth,
            workerId: input.workerId,
            email: input.email,
            phone: input.phone,
            landlordName: input.landlordName,
            leaseStart: input.leaseStart,
            leaseEnd: input.leaseEnd,
          },
        });

        return { ok: true, client };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: message ?? "Failed to add client",
        });
      }
    }),

  editClient: interventionTeamProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        firstName: z.string().min(1, "First name is required").optional(),
        lastName: z.string().min(1, "Last name is required").optional(),
        dateOfBirth: z.date().optional(),
        workerId: z.string().optional(),
        email: z.email().optional().nullable(),
        phone: z.string().optional().nullable(),
        landlordName: z.string().optional().nullable(),
        leaseStart: z.date().optional().nullable(),
        leaseEnd: z.date().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...updateData } = input;

        // Check if client exists
        const existingClient = await ctx.db.client.findUnique({
          where: { id },
        });

        if (!existingClient) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }

        // Update the client
        const client = await ctx.db.client.update({
          where: { id },
          data: updateData,
        });

        return { ok: true, client };
      } catch (err: unknown) {
        if (err instanceof TRPCError) {
          throw err;
        }
        const message = err instanceof Error ? err.message : String(err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: message ?? "Failed to edit client",
        });
      }
    }),

  deleteClient: interventionTeamProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if client exists
        const existingClient = await ctx.db.client.findUnique({
          where: { id: input.id },
        });

        if (!existingClient) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }

        // Delete the client
        await ctx.db.client.delete({
          where: { id: input.id },
        });

        return { ok: true };
      } catch (err: unknown) {
        if (err instanceof TRPCError) {
          throw err;
        }
        const message = err instanceof Error ? err.message : String(err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: message ?? "Failed to delete client",
        });
      }
    }),
  list: interventionTeamProcedure.query(async ({ ctx }) => {
    try {
      const clients = await ctx.db.client.findMany({
        include: {
          worker: true,
        },
      });
      return clients;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: message ?? "Failed to fetch clients",
      });
    }
  }),
});
