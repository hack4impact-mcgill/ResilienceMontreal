import { create } from "domain";
import * as z from "zod";

export const createGrantSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
  totalAmount: z.coerce
    .number()
    .positive("Total amount must be greater than zero"),
  endDate: z.coerce.date(),
  status: z.enum(["PENDING", "APPROVED"]),
});

export const updateGrantSchema = z
  .object({
    id: z.coerce.number().int().positive("GrantID must be a positive integer"),
    title: z.string().trim().min(1, "Title is empty").optional(),
    description: z.string().trim().min(1, "Description is empty").optional(),
    endDate: z.coerce.date().optional(),
    status: z.enum(["PENDING", "APPROVED"]).optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.endDate !== undefined ||
      data.status !== undefined,
    { message: "At least one field must be provided for update" },
  );
