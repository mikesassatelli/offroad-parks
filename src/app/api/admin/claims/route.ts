import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ClaimStatus = "PENDING" | "APPROVED" | "REJECTED";

// GET /api/admin/claims?status=PENDING&page=1&limit=20
export async function GET(request: Request) {
  const session = await auth();
  // @ts-expect-error - role added in auth callback
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = (searchParams.get("status") as ClaimStatus) || "PENDING";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const skip = (page - 1) * limit;

  const where = { status };

  const [total, claims] = await Promise.all([
    prisma.parkClaim.count({ where }),
    prisma.parkClaim.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        park: {
          select: {
            id: true,
            name: true,
            slug: true,
            address: { select: { city: true, state: true } },
          },
        },
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    }),
  ]);

  return NextResponse.json({
    claims,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
