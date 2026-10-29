import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createDriveFolder,
  getGoogleDriveStatus,
  listDriveFolder,
  renameDriveItem,
  trashDriveItem,
} from "~/server/google-drive";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const asDriveError = (error: unknown) =>
  new TRPCError({
    code: "BAD_REQUEST",
    message:
      error instanceof Error ? error.message : "Google Drive request failed.",
  });

export const documentsRouter = createTRPCRouter({
  status: protectedProcedure.query(() => getGoogleDriveStatus()),
  list: protectedProcedure
    .input(z.object({ folderId: z.string().optional() }))
    .query(async ({ input }) => {
      try {
        return await listDriveFolder(input.folderId);
      } catch (error) {
        throw asDriveError(error);
      }
    }),
  createFolder: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(150),
        parentId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        return await createDriveFolder(input.name, input.parentId);
      } catch (error) {
        throw asDriveError(error);
      }
    }),
  rename: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().trim().min(1).max(150),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        return await renameDriveItem(input.id, input.name);
      } catch (error) {
        throw asDriveError(error);
      }
    }),
  trash: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input }) => {
      try {
        await trashDriveItem(input.id);
      } catch (error) {
        throw asDriveError(error);
      }
    }),
});
