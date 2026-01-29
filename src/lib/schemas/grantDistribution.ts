import * as z from "zod";

export const createGrantDistributionSchema = z.object({
  grantId: z.coerce.number().int().positive(),
  fundPoolId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
});
