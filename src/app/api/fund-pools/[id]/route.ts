import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

// Get a specific fund pool by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = parseInt((await params).id, 10);
    const fundPool = await prisma.fundPool.findUnique({
      where: { id },
      include: {
        distributions: { include: { grant: true } },
        fundAllocations: true,
      },
    });
    if (!fundPool) {
      return NextResponse.json(
        { error: "FundPool not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ fundPool }, { status: 200 });
  } catch (error) {
    console.error("Get FundPool error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// Update a specific fund pool by ID
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = parseInt((await params).id, 10);

    const { amount, category } = await request.json();

    const updateData: Prisma.FundPoolUpdateInput = {};

    if (amount !== undefined)
      updateData.amount = new Prisma.Decimal(String(amount));
    if (category !== undefined) {
      const existingCategory = await prisma.fundPool.findUnique({
        where: { category },
      });
      if (existingCategory && existingCategory.id !== id) {
        return NextResponse.json(
          { error: "Category must be unique" },
          { status: 400 },
        );
      }
      updateData.category = category.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const updatedFundPool = await prisma.fundPool.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ fundPool: updatedFundPool }, { status: 200 });
  } catch (error) {
    console.error("Update FundPool error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// Delete a specific fund pool by ID
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = parseInt((await params).id, 10);
    await prisma.fundPool.delete({
      where: { id },
    });
    return NextResponse.json({ message: "FundPool deleted" }, { status: 200 });
  } catch (error) {
    console.error("Delete FundPool error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
