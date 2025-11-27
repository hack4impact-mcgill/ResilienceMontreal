import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

const bodySchema = z.object({ roleId: z.coerce.number().int().positive() });

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
      include: { role: true },
    });

    if (!requestingUser || requestingUser.role?.name !== "Admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    // Validate params
    const paramsObj = (await params) as { id: string };
    const targetId = Number(paramsObj.id);
    if (Number.isNaN(targetId) || targetId <= 0) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    // Validate body
    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
    }
    const { roleId } = parsed.data;

    // Prevent changing own role
    if (requestingUser.id === targetId) {
      return NextResponse.json({ error: "Cannot change own role" }, { status: 403 });
    }

    // Verify role exists
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Update user's role
    const updatedUser = await prisma.user.update({
      where: { id: targetId },
      data: { roleId: role.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ user: updatedUser }, { status: 200 });
  } catch (error) {
    console.error("Assign role error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
