import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

// Create a new fund pool
export async function POST(request: Request) {
  try {
    const { category, amount } = await request.json();

    if (amount == null || !category) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const totalAmount = new Prisma.Decimal(String(amount));
    if (totalAmount.lessThan(0)) {
      return NextResponse.json(
        { error: "Amount cannot be less than zero" },
        { status: 400 },
      );
    }

    const result = await prisma.fundPool.create({
      data: {
        amount: totalAmount,
        category: category.trim(),
      },
      include: {
        distributions: { include: { grant: true } },
        fundAllocations: true,
      },
    });

    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    console.error("Create FundPool error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// Get all fund pools
export async function GET() {
  try {
    const fundPools = await prisma.fundPool.findMany({
      include: {
        distributions: { include: { grant: true } },
        fundAllocations: true,
      },
    });
    return NextResponse.json({ fundPools }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
