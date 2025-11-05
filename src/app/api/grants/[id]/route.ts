import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

// Get a specific grant by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseInt(params.id, 10);
    const grant = await prisma.grant.findUnique({
      where: { id },
      include: {
        distributions: { include: { fundPool: true } },
      },
    });
    if (!grant) {
      return NextResponse.json({ error: "Grant not found" }, { status: 404 });
    }

    return NextResponse.json({ grant }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// Update a specific grant by ID
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseInt(params.id, 10);

    const { title, description, endDate, status } = await request.json();

    const updateData: Prisma.GrantUpdateInput = {};

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (status !== undefined) updateData.status = status; // should i check if valid status or let prisma handle validation?

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const updatedGrant = await prisma.grant.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ grant: updatedGrant }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// Delete a specific grant by ID
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const id = parseInt(params.id, 10);
    await prisma.grant.delete({
      where: { id },
    });
    return NextResponse.json({ message: "Grant deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
