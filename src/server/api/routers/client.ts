import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Prisma } from "~/generated/prisma/client";

import {
  createTRPCRouter,
  interventionTeamProcedure,
  protectedProcedure,
} from "~/server/api/trpc";

export const clientRouter = createTRPCRouter({
  addClient: interventionTeamProcedure
    .input(
      z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        dateOfBirth: z.date(),
        workerId: z.string().min(1, "Intervention worker is required"),
        email: z.email().optional().nullable(),
        phone: z.string().optional().nullable(),
        landlordName: z.string().optional().nullable(),
        leaseStart: z.date().optional().nullable(),
        leaseEnd: z.date().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Validate workerId
        const workerExists = await ctx.db.user.findUnique({
          where: { supabaseId: input.workerId },
        });

        if (!workerExists) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selected intervention worker does not exist",
          });
        }

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
        if (err instanceof TRPCError) {
          throw err;
        }
        // Handle Prisma constraint errors
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("Foreign key constraint")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Invalid intervention worker selected. Please select a valid worker.",
          });
        }
        if (
          message.includes("Unique constraint") &&
          message.includes("email")
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This email address is already in use by another client.",
          });
        }
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
        workerId: z
          .string()
          .min(1, "Intervention worker is required")
          .optional(),
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

        const existingClient = await ctx.db.client.findUnique({
          where: { id },
        });

        if (!existingClient) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }

        if (updateData.workerId) {
          const workerExists = await ctx.db.user.findUnique({
            where: { supabaseId: updateData.workerId },
          });

          if (!workerExists) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Selected intervention worker does not exist",
            });
          }
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
        // Handle (common) Prisma constraint errors
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("Foreign key constraint")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Invalid intervention worker selected. Please select a valid worker.",
          });
        }
        if (message.includes("Unique constraint")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Duplicate field detected. Please ensure the email address is unique.",
          });
        }
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
  getClients: protectedProcedure
    .input(
      z.object({
        // Pagination
        page: z.number().int().positive().default(1),
        limit: z.number().int().min(1).max(100).default(20),

        // Sorting
        sortBy: z
          .enum(["firstName", "lastName", "createdAt", "leaseEnd", "workerId"])
          .default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),

        // Filters
        search: z.string().optional(),
        workerId: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;

      // Build where clause
      const where: Prisma.ClientWhereInput = {
        AND: [
          input.search
            ? {
                OR: [
                  {
                    firstName: {
                      contains: input.search,
                      mode: "insensitive",
                    },
                  },
                  {
                    lastName: {
                      contains: input.search,
                      mode: "insensitive",
                    },
                  },
                  {
                    email: {
                      contains: input.search,
                      mode: "insensitive",
                    },
                  },
                ],
              }
            : {},
          input.workerId ? { workerId: input.workerId } : {},
          input.dateFrom || input.dateTo
            ? {
                leaseEnd: {
                  ...(input.dateFrom && { gte: input.dateFrom }),
                  ...(input.dateTo && { lte: input.dateTo }),
                },
              }
            : {},
        ],
      };

      // Get total count and data
      const [total, clients] = await Promise.all([
        ctx.db.client.count({ where }),
        ctx.db.client.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: { [input.sortBy]: input.sortOrder },
          include: {
            worker: {
              select: { name: true, email: true, supabaseId: true, role: true },
            },
          },
        }),
      ]);

      return {
        data: clients,
        metadata: {
          total,
          page: input.page,
          limit: input.limit,
          totalPages: Math.ceil(total / input.limit),
          hasNextPage: skip + input.limit < total,
          hasPrevPage: input.page > 1,
        },
      };
    }),
});
