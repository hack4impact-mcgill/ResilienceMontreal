import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";
import { RoleName } from "~/generated/prisma/client";

const bodySchema = z.object({ role: z.nativeEnum(RoleName) });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Authenticate
    const supabase = await createClient();
    const {
      data: { user: sbUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !sbUser?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure requester is an Admin
    const requestingUser = await prisma.user.findUnique({
      where: { email: sbUser.email },
    });

    if (!requestingUser || requestingUser.role !== "Admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    // Validate params
    const paramsObj = (await params) as { id: string };
    const targetId = paramsObj.id;
    if (!targetId || typeof targetId !== "string") {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    // Validate body
    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { role } = parsed.data;

    // Prevent changing own role
    if (requestingUser.supabaseId === targetId) {
      return NextResponse.json(
        { error: "Cannot change your own role" },
        { status: 403 },
      );
    }

    // Get the target user to check if they're currently an Admin
    const targetUser = await prisma.user.findUnique({
      where: { supabaseId: targetId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If demoting an admin, check if they're the last admin
    if (targetUser.role === "Admin" && role !== "Admin") {
      const adminCount = await prisma.user.count({
        where: { role: "Admin" },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          {
            error:
              "Cannot remove the last admin. Please promote another user to Admin first.",
          },
          { status: 400 },
        );
      }
    }

    // Update user's role
    const updatedUser = await prisma.user.update({
      where: { supabaseId: targetId },
      data: { role },
      select: {
        supabaseId: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({ user: updatedUser }, { status: 200 });
  } catch (error) {
    console.error("Assign role error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
