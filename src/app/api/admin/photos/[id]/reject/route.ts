import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

// POST /api/admin/photos/[id]/reject - Reject a photo
export async function POST(_request: Request, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const userRole = (session.user as { role?: string })?.role;
  if (userRole !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const photo = await prisma.parkPhoto.update({
      where: { id },
      data: { status: "REJECTED" },
      include: {
        park: {
          select: {
            name: true,
            slug: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, photo });
  } catch (error) {
    console.error("Failed to reject photo:", error);
    return NextResponse.json(
      { error: "Failed to reject photo" },
      { status: 500 },
    );
  }
}
