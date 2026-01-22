import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { Prisma } from "@prisma/client";
import { createGrantSchema, updateGrantSchema } from "~/lib/schemas/grant";
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

  // Endpoint to fetch all grants
  // Example: GET http://localhost:3000/api/trpc/grant.getGrants?input={}
  getGrants: protectedProcedure.query(async ({ ctx }) => {
    const grants = await ctx.db.grant.findMany({
      include: { ...grantInclude },
    });
    return grants;
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
      })
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      const deletedGrant = await ctx.db.grant.delete({
        where: { id: input.id },
      });
      return deletedGrant;
    }),
});
