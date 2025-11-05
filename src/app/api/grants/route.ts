import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

// Create a new grant
export async function POST(request: Request) {
  try {
    const { title, description, totalAmount, endDate, status } =
      await request.json();

    if (!title || !description || !status || totalAmount == null) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const amount = new Prisma.Decimal(String(totalAmount));
    if (amount.lessThanOrEqualTo(0)) {
      return NextResponse.json(
        { error: "Amount must be greater than zero" },
        { status: 400 },
      );
    }

    const result = await prisma.grant.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        totalAmount: amount,
        unassignedAmount: amount,
        endDate: endDate ? new Date(endDate) : null,
        status,
      },
    });

    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    console.error("Create Grant error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// Get all grants
export async function GET() {
  try {
    const grants = await prisma.grant.findMany({
      include: {
        distributions: { include: { fundPool: true } },
      },
    });
    return NextResponse.json({ grants }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
