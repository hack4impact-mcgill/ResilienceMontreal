import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { Prisma } from "@prisma/client";
import {
	createGrantFullSchema,
	updateGrantFullSchema,
} from "~/lib/schemas/grant";
import { TRPCError } from "@trpc/server";

// Use existing schema fields. Workarounds:
// - Store extra grant metadata (category, dates, email, phone, notes) inside Grant.description as JSON.
// - Treat FundPool.amount as the available amount (deduct on create, add back on delete).

const grantInclude = {
	distributions: { include: { fundPool: true } },
} as const;

export const grantRouter = createTRPCRouter({
		// getAll - public: return all grants with distributions
		// make this public so the Grants page doesn't hard-fail for unauthenticated visitors
		getAll: publicProcedure.query(async ({ ctx }) => {
			const grants = await ctx.db.grant.findMany({ include: grantInclude });
			return grants;
		}),

		// create - transactional: create grant, create one GrantDistribution linking to fundPool, deduct fund pool amount
		create: protectedProcedure.input(createGrantFullSchema).mutation(async ({ ctx, input }) => {
			const amount = new Prisma.Decimal(String(input.amount));

			return await ctx.db.$transaction(async (tx) => {
				const fundPool = await tx.fundPool.findUnique({ where: { id: input.fundPoolId } });
				if (!fundPool) {
					throw new TRPCError({ code: "NOT_FOUND", message: "Fund pool not found" });
				}

				const available = new Prisma.Decimal(String(fundPool.amount));
				if (available.lessThan(amount)) {
					throw new TRPCError({ code: "CONFLICT", message: "Insufficient funds in fund pool" });
				}

				const descriptionObj = {
					notes: input.notes ?? null,
					category: input.category,
					dateReceived: input.dateReceived.toISOString(),
					toBeUsedBy: input.toBeUsedBy.toISOString(),
					email: input.email ?? null,
					phoneNumber: input.phoneNumber ?? null,
				};

				const createdGrant = await tx.grant.create({
					data: {
						title: input.organization,
						description: JSON.stringify(descriptionObj),
						totalAmount: amount,
						unassignedAmount: amount,
						status: "PENDING",
					},
				});

				// create a single distribution for this grant
				await tx.grantDistribution.create({
					data: {
						grantId: createdGrant.id,
						fundPoolId: input.fundPoolId,
						amount: amount,
					},
				});

				// deduct from fundPool.amount
				await tx.fundPool.update({
					where: { id: input.fundPoolId },
					data: { amount: new Prisma.Decimal(String(fundPool.amount)).minus(amount) },
				});

				const result = await tx.grant.findUnique({ where: { id: createdGrant.id }, include: grantInclude });
				return result;
			});
		}),

		// update - update grant metadata, optionally amount, and optionally move distribution to another fund pool
		update: protectedProcedure.input(updateGrantFullSchema).mutation(async ({ ctx, input }) => {
			const { id, amount: newAmountRaw, fundPoolId: newFundPoolId, ...rest } = input as any;
			const newAmount = newAmountRaw !== undefined ? new Prisma.Decimal(String(newAmountRaw)) : undefined;

			// if only metadata changes (no amount and no fundPoolId changes)
			if (newAmount === undefined && newFundPoolId === undefined) {
				const grant = await ctx.db.grant.findUnique({ where: { id } });
				if (!grant) throw new TRPCError({ code: "NOT_FOUND", message: "Grant not found" });

				let descriptionObj: any = {};
				try {
					descriptionObj = grant.description ? JSON.parse(grant.description) : {};
				} catch (e) {
					descriptionObj = { notes: grant.description };
				}

				if (rest.organization !== undefined) {
					await ctx.db.grant.update({ where: { id }, data: { title: rest.organization } });
				}

				const allowedMeta = ["category", "dateReceived", "toBeUsedBy", "email", "phoneNumber", "notes"];
				let didMeta = false;
				for (const k of allowedMeta) {
					if (rest[k] !== undefined) {
						descriptionObj[k] = rest[k];
						didMeta = true;
					}
				}

				if (didMeta) {
					await ctx.db.grant.update({ where: { id }, data: { description: JSON.stringify(descriptionObj) } });
				}

				const updated = await ctx.db.grant.findUnique({ where: { id }, include: grantInclude });
				return updated;
			}

			// handle amount or fundPool changes transactionally
			return await ctx.db.$transaction(async (tx) => {
				const grant = await tx.grant.findUnique({ where: { id }, include: { distributions: true } });
				if (!grant) throw new TRPCError({ code: "NOT_FOUND", message: "Grant not found" });

				const distributions = grant.distributions || [];
				if (distributions.length > 1) {
					throw new TRPCError({ code: "CONFLICT", message: "Multiple distributions found for grant (splitting not supported)" });
				}

				const oldAmount = new Prisma.Decimal(String(grant.totalAmount));
				const amountToSet = newAmount ?? oldAmount;
				const diff = amountToSet.minus(oldAmount); // positive => need more funds from pool

				// if there's no existing distribution but client provides a fundPoolId, create one
				if (distributions.length === 0) {
					if (!newFundPoolId) {
						throw new TRPCError({ code: "CONFLICT", message: "No distribution exists for grant; provide fundPoolId to associate" });
					}

					const newFundPool = await tx.fundPool.findUnique({ where: { id: newFundPoolId } });
					if (!newFundPool) throw new TRPCError({ code: "NOT_FOUND", message: "Fund pool not found" });

					const available = new Prisma.Decimal(String(newFundPool.amount));
					if (available.lessThan(amountToSet)) throw new TRPCError({ code: "CONFLICT", message: "Insufficient funds in fund pool" });

					await tx.grantDistribution.create({ data: { grantId: grant.id, fundPoolId: newFundPoolId, amount: amountToSet } });
					await tx.fundPool.update({ where: { id: newFundPoolId }, data: { amount: available.minus(amountToSet) } });
				} else {
					// there is an existing single distribution
					const dist = distributions[0];
					const currentFundPool = await tx.fundPool.findUnique({ where: { id: dist.fundPoolId } });
					if (!currentFundPool) throw new TRPCError({ code: "NOT_FOUND", message: "Fund pool not found" });

					// if fundPoolId is changing, move funds between pools
					if (newFundPoolId !== undefined && newFundPoolId !== dist.fundPoolId) {
						const targetPool = await tx.fundPool.findUnique({ where: { id: newFundPoolId } });
						if (!targetPool) throw new TRPCError({ code: "NOT_FOUND", message: "Target fund pool not found" });

						// return current distribution amount to old pool
						await tx.fundPool.update({ where: { id: currentFundPool.id }, data: { amount: new Prisma.Decimal(String(currentFundPool.amount)).plus(new Prisma.Decimal(String(dist.amount))) } });

						// ensure target pool has available funds for amountToSet
						const targetAvailable = new Prisma.Decimal(String(targetPool.amount));
						if (targetAvailable.lessThan(amountToSet)) throw new TRPCError({ code: "CONFLICT", message: "Insufficient funds in target fund pool" });

						// deduct from target pool
						await tx.fundPool.update({ where: { id: targetPool.id }, data: { amount: targetAvailable.minus(amountToSet) } });

						// update distribution to point to new pool and amount
						await tx.grantDistribution.update({ where: { id: dist.id }, data: { fundPoolId: newFundPoolId, amount: amountToSet } });
					} else {
						// same pool: adjust by diff (positive => deduct more, negative => refund)
						const available = new Prisma.Decimal(String(currentFundPool.amount));
						if (diff.greaterThan(new Prisma.Decimal(0)) && available.lessThan(diff)) {
							throw new TRPCError({ code: "CONFLICT", message: "Insufficient funds in fund pool for increase" });
						}

						await tx.grantDistribution.update({ where: { id: dist.id }, data: { amount: amountToSet } });
						await tx.fundPool.update({ where: { id: currentFundPool.id }, data: { amount: new Prisma.Decimal(String(currentFundPool.amount)).minus(diff) } });
					}
				}

				// update grant totals
				const newUnassigned = new Prisma.Decimal(String(grant.unassignedAmount)).plus(diff);
				await tx.grant.update({ where: { id }, data: { totalAmount: amountToSet, unassignedAmount: newUnassigned } });

				// also handle metadata updates
				if (rest.organization || rest.category || rest.notes || rest.dateReceived || rest.toBeUsedBy || rest.email || rest.phoneNumber) {
					const current = await tx.grant.findUnique({ where: { id } });
					let descriptionObj: any = {};
					try { descriptionObj = current?.description ? JSON.parse(current?.description) : {}; } catch (e) { descriptionObj = { notes: current?.description }; }
					const fieldsToMap: any = { category: rest.category, dateReceived: rest.dateReceived, toBeUsedBy: rest.toBeUsedBy, email: rest.email, phoneNumber: rest.phoneNumber, notes: rest.notes };
					for (const k of Object.keys(fieldsToMap)) {
						if (fieldsToMap[k] !== undefined) descriptionObj[k] = fieldsToMap[k];
					}
					if (rest.organization !== undefined) {
						await tx.grant.update({ where: { id }, data: { title: rest.organization, description: JSON.stringify(descriptionObj) } });
					} else {
						await tx.grant.update({ where: { id }, data: { description: JSON.stringify(descriptionObj) } });
					}
				}

				const updated = await tx.grant.findUnique({ where: { id }, include: grantInclude });
				return updated;
			});
		}),

		// delete - restore funds to associated fund pools, delete distribution(s) and grant transactionally
		delete: protectedProcedure
			.input(z.object({ id: z.coerce.number().int().positive("GrantID must be a positive integer") }))
			.mutation(async ({ ctx, input }) => {
				return await ctx.db.$transaction(async (tx) => {
					const grant = await tx.grant.findUnique({ where: { id: input.id }, include: { distributions: true } });
					if (!grant) throw new TRPCError({ code: "NOT_FOUND", message: "Grant not found" });

					const distributions = grant.distributions || [];
					for (const d of distributions) {
						const fundPool = await tx.fundPool.findUnique({ where: { id: d.fundPoolId } });
						if (!fundPool) throw new TRPCError({ code: "NOT_FOUND", message: "Fund pool not found" });

						const available = new Prisma.Decimal(String(fundPool.amount));
						await tx.fundPool.update({ where: { id: fundPool.id }, data: { amount: available.plus(new Prisma.Decimal(String(d.amount))) } });

						await tx.grantDistribution.delete({ where: { id: d.id } });
					}

					const deleted = await tx.grant.delete({ where: { id: input.id } });
					return deleted;
				});
			}),
});


