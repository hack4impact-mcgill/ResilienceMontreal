import * as z from "zod";

export const createGrantSchema = z.object({
  title: z.string().trim().min(1, "title is required"),
  description: z.string().trim().min(1, "description is required"),
  totalAmount: z.coerce
    .number()
    .positive("total amount must be greater than zero"),
  endDate: z.coerce.date(),
  status: z.enum(["PENDING", "APPROVED"]),
});

export const updateGrantSchema = z
  .object({
    id: z.coerce.number().int().positive("grantID must be a positive integer"),
    title: z.string().trim().min(1, "title is empty").optional(),
    description: z.string().trim().min(1, "description is empty").optional(),
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
    { message: "at least one field must be provided for update" },
  );

// New schemas for Grants CRUD used by the new grants router
export const createGrantFullSchema = z.object({
  organization: z.string().trim().min(1, "Organization is required"),
  category: z.string().trim().min(1, "Category is required"),
  dateReceived: z.coerce.date(),
  toBeUsedBy: z.coerce.date(),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  notes: z.string().optional(),
  amount: z.coerce.number().positive("Amount must be > 0"),
  // require a fund pool id so each grant gets one GrantDistribution associated with a FundPool
  fundPoolId: z.coerce.number().int().positive("FundPoolId required"),
});

export const updateGrantFullSchema = z
  .object({
    id: z.coerce.number().int().positive("GrantID must be a positive integer"),
    organization: z.string().trim().min(1).optional(),
    category: z.string().trim().min(1).optional(),
    dateReceived: z.coerce.date().optional(),
    toBeUsedBy: z.coerce.date().optional(),
    email: z.string().email().optional(),
    phoneNumber: z.string().optional(),
    notes: z.string().optional(),
    amount: z.coerce.number().positive("Amount must be > 0").optional(),
    fundPoolId: z.coerce.number().int().positive().optional(),
  })
  .refine((data) => Object.keys(data).length > 1, {
    message: "At least one field to update must be provided",
  });
export const grantQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),

  sortBy: z
    .enum(["createdAt", "totalAmount", "endDate", "title"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),

  title: z.string().optional(),
  minAmount: z.coerce.number().positive().optional(),
  maxAmount: z.coerce.number().positive().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.enum(["PENDING", "APPROVED"]).optional(),
});
