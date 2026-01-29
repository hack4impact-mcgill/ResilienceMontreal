import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const createClientSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.coerce.date(),
  workerId: z.number().int().positive("Worker ID must be a positive integer"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  landlordName: z.string().min(1, "Landlord name is required"),
  leaseStartDate: z.coerce.date(),
  leaseEndDate: z.coerce.date().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request body with Zod
    const validationResult = createClientSchema.safeParse(body);

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

    // Verify that the worker (User) exists
    const worker = await prisma.user.findUnique({
      where: { id: validatedData.workerId },
    });

    if (!worker) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }

    // Create the client
    const client = await prisma.client.create({
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        dateOfBirth: validatedData.dateOfBirth,
        workerId: validatedData.workerId,
        email: validatedData.email,
        phoneNumber: validatedData.phoneNumber,
        landlordName: validatedData.landlordName,
        leaseStartDate: validatedData.leaseStartDate,
        leaseEndDate: validatedData.leaseEndDate ?? null,
      },
      include: {
        worker: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    console.error("Create client error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
