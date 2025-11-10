import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Update park status
    const park = await prisma.park.update({
      where: { id },
      data: { status: "APPROVED" },
    });

    return NextResponse.json({ success: true, park });
  } catch (error) {
    console.error("Error approving park:", error);
    return NextResponse.json(
      { error: "Failed to approve park" },
      { status: 500 },
    );
  }
}
