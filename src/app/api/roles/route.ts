import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{}> },
) {
  try {
    // 1. Check authentication
    const supabase = await createClient();
    const {
      data: { user: sbUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !sbUser?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Check if requesting user is Admin
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

    // 3. Get userId from URL params and roleId from body
    const paramsObj = (await params) as { id: string };
    const { id } = paramsObj;
    const { roleId } = await request.json();

    if (!roleId || isNaN(Number(roleId))) {
      return NextResponse.json({ error: "Invalid roleId" }, { status: 400 });
    }

    // 4. Verify role exists
    const role = await prisma.role.findUnique({
      where: { id: Number(roleId) },
    });

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // 5. Update user's role
    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
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
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
