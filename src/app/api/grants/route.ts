import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { grantQuerySchema } from "@/lib/schemas/grant";

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

// Get all grants with filtering and stuff 
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const queryParams = {
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder"),
      title: searchParams.get("title"),
      minAmount: searchParams.get("minAmount"),
      maxAmount: searchParams.get("maxAmount"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
      status: searchParams.get("status"),
    };

    const validationResult = grantQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "invalid query parameters",
          details: validationResult.error.issues,
        },
        { status: 400 },
      );
    }

    const {
      page,
      limit,
      sortBy,
      sortOrder,
      title,
      minAmount,
      maxAmount,
      startDate,
      endDate,
      status,
    } = validationResult.data;

    const where: Prisma.GrantWhereInput = {};

    if (title) {
      where.title = {
        contains: title,
        mode: "insensitive",
      };
    }

    if (minAmount !== undefined || maxAmount !== undefined) {
      where.totalAmount = {};
      if (minAmount !== undefined) {
        where.totalAmount.gte = new Prisma.Decimal(minAmount);
      }
      if (maxAmount !== undefined) {
        where.totalAmount.lte = new Prisma.Decimal(maxAmount);
      }
    }

    if (startDate !== undefined || endDate !== undefined) {
      where.endDate = {};
      if (startDate !== undefined) {
        where.endDate.gte = startDate;
      }
      if (endDate !== undefined) {
        where.endDate.lte = endDate;
      }
    }

    if (status) {
      where.status = status;
    }

    const skip = (page - 1) * limit;

    const orderBy: Prisma.GrantOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [grants, totalCount] = await Promise.all([
      prisma.grant.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          distributions: { include: { fundPool: true } },
        },
      }),
      prisma.grant.count({ where }),
    ]);

    // paginatuion metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json(
      {
        grants,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalCount,
          totalPages,
          hasNextPage,
          hasPreviousPage,
          returnedCount: grants.length,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get grants error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
