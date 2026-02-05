import * as z from "zod";

export const createFundPoolSchema = z.object({
  category: z.string().trim().min(1, "Category is required"),
  amount: z.coerce.number().nonnegative("Amount cannot be less than zero").optional(),
});

export const updateFundPoolSchema = z
  .object({
    id: z.coerce
      .number()
      .int()
      .positive("FundPoolID must be a positive integer"),
    category: z.string().trim().min(1, "Category is required").optional(),
    amount: z.coerce
      .number()
      .nonnegative("Amount cannot be less than zero")
      .optional(),
  })
  .strict()
  .refine((data) => data.category !== undefined || data.amount !== undefined, {
    message: "At least one field must be provided for update",
  });
