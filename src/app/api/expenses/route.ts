import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { totalAmount, description, date, invoiceUrl } = await request.json();

    // Validate required fields
    if (!totalAmount || !description || !date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate totalAmount and date
    const amount = parseFloat(String(totalAmount));
    if (Number.isNaN(amount)) {
      return NextResponse.json(
        { error: "Invalid input: totalAmount must be a number" },
        { status: 400 }
      );
    }
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid input: date must be a valid date" },
        { status: 400 }
      );
    }

    // Create the expense
    const expense = await prisma.expense.create({
      data: {
        totalAmount: amount,
        description,
        date: parsedDate,
        invoiceUrl: invoiceUrl ?? undefined,
      }
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error("Create expense error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const expenses = await prisma.expense.findMany({
      skip,
      take: limit,
      orderBy: {
        date: 'desc'
      }
    });

    const total = await prisma.expense.count();

    return NextResponse.json({
      expenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Get expenses error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
