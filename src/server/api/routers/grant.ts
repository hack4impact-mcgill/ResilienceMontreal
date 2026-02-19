import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { Prisma } from "@prisma/client";
import {
  createGrantSchema,
  updateGrantSchema,
  grantQuerySchema,
} from "~/lib/schemas/grant";
import { TRPCError } from "@trpc/server";

const grantInclude = {
  distributions: { include: { fundPool: true } },
} as const;

export const grantRouter = createTRPCRouter({
  // Endpoint to create a new grant using given title, description, totalAmount, endDate and status
  // Example: POST http://localhost:3000/api/trpc/grant.createGrant with body {"json": {"title": "example", "description": "example", "totalAmount": 100, "endDate": "2023-12-31", "status": "PENDING"}}
  createGrant: protectedProcedure
    .input(createGrantSchema)
    .mutation(async ({ ctx, input }) => {
      const totalAmount = new Prisma.Decimal(String(input.totalAmount));
      const newGrant = await ctx.db.grant.create({
        data: {
          title: input.title,
          description: input.description,
          totalAmount: totalAmount,
          unassignedAmount: totalAmount,
          endDate: input.endDate,
          status: input.status,
        },
        include: { ...grantInclude },
      });
      return newGrant;
    }),

  // Endpoint to fetch grants with filtering, sorting, and pagination
  // Example: GET http://localhost:3000/api/trpc/grant.getGrants?input={"json":{"page":1,"limit":10,"sortBy":"createdAt","sortOrder":"desc"}}
  getGrants: protectedProcedure
    .input(grantQuerySchema.optional())
    .query(async ({ ctx, input }) => {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
        title,
        minAmount,
        maxAmount,
        startDate,
        endDate,
        status,
      } = input ?? {};

      const where: Prisma.GrantWhereInput = {};

      if (title) {
        where.title = {
          contains: title,
          mode: "insensitive",
        };
      }

      if (minAmount !== undefined || maxAmount !== undefined) {
        where.totalAmount = {};
        if (minAmount !== undefined) {
          where.totalAmount.gte = new Prisma.Decimal(minAmount);
        }
        if (maxAmount !== undefined) {
          where.totalAmount.lte = new Prisma.Decimal(maxAmount);
        }
      }

      if (startDate !== undefined || endDate !== undefined) {
        where.endDate = {};
        if (startDate !== undefined) {
          where.endDate.gte = startDate;
        }
        if (endDate !== undefined) {
          where.endDate.lte = endDate;
        }
      }

      if (status) {
        where.status = status;
      }

      const skip = (page - 1) * limit;

      const orderBy: Prisma.GrantOrderByWithRelationInput = {
        [sortBy]: sortOrder,
      };

      const [grants, totalCount] = await Promise.all([
        ctx.db.grant.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include: { ...grantInclude },
        }),
        ctx.db.grant.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        grants,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalCount,
          totalPages,
          hasNextPage,
          hasPreviousPage,
          returnedCount: grants.length,
        },
      };
    }),

  // Endpoint to fetch a grant by ID
  // Example: GET http://localhost:3000/api/trpc/grant.getGrantById?batch=1&input={"0":{"json": {"id": 1}}}
  getGrantById: protectedProcedure
    .input(
      z.object({
        id: z.coerce
          .number()
          .int()
          .positive("GrantID must be a positive integer"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const grant = await ctx.db.grant.findUnique({
        where: { id: input.id },
        include: { ...grantInclude },
      });

      if (!grant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Grant not found",
        });
      }
      return grant;
    }),

  /* Endpoint to update a grant by ID
  POST http://localhost:3000/api/trpc/grant.updateGrantById?batch=1
  with body:
    {
    "0": {
      "json": {
        "id": 1,
        "title": "Updated Title",
      }
    }
   } 
  */
  updateGrantById: protectedProcedure
    .input(updateGrantSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateFields } = input;
      const updateGrant = await ctx.db.grant.update({
        where: { id },
        data: { ...updateFields },
      });
      return updateGrant;
    }),

  /* Endpoint to delete a grant by ID
  POST http://localhost:3000/api/trpc/grant.deleteGrantById?batch=1
  with body:
    {
      "0": {
        "json": {
          "id": 1
        }
      }
    }
  */
  deleteGrantById: protectedProcedure
    .input(
      z.object({
        id: z.coerce
          .number()
          .int()
          .positive("GrantID must be a positive integer"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const deletedGrant = await ctx.db.grant.delete({
        where: { id: input.id },
      });
      return deletedGrant;
    }),
});
