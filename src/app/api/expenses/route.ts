import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const createExpenseSchema = z.object({
  client: z.string().min(1, "Client is required"),
  spendingCategory: z.array(z.string()).min(1, "Select at least one category"),
  purchaseDate: z.coerce.date(),
  clientEmail: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  notes: z.string().optional().default(""),
  amount: z.number().positive("Amount must be positive"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request body with Zod
    const validationResult = createExpenseSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.issues,
        },
        { status: 400 },
      );
    }

    const validatedData = validationResult.data;

    // Create the expense
    // Note: The Prisma Expense model may need to be updated to include these fields
    // For now, mapping to existing fields where possible
    const expense = await prisma.expense.create({
      data: {
        description: `${validatedData.client} - ${validatedData.spendingCategory.join(", ")}`,
        totalAmount: validatedData.amount,
        date: validatedData.purchaseDate,
        invoiceUrl: null, // Store notes in invoiceUrl temporarily if needed, or update schema
      },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error("Create expense error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
