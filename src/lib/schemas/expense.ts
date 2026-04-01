import * as z from "zod";

export const expenseListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(30),

  sortBy: z
    .enum(["date", "totalAmount", "description", "id"])
    .default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),

  description: z.string().optional(),
  minAmount: z.coerce.number().positive().optional(),
  maxAmount: z.coerce.number().positive().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
