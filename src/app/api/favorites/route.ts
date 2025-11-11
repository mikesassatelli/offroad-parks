import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/favorites - Get user's favorites
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const favorites = await prisma.userFavorite.findMany({
    where: { userId: session.user.id },
    include: {
      park: {
        include: {
          terrain: true,
          difficulty: true,
          amenities: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(favorites);
}

// POST /api/favorites - Add a favorite
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { parkId } = await request.json();

  if (!parkId) {
    return NextResponse.json({ error: "Park ID required" }, { status: 400 });
  }

  // The frontend sends the slug as parkId, so we need to look up by slug
  const park = await prisma.park.findUnique({
    where: { slug: parkId },
  });

  if (!park) {
    return NextResponse.json({ error: "Park not found" }, { status: 404 });
  }

  // Check if favorite already exists
  const existing = await prisma.userFavorite.findUnique({
    where: {
      userId_parkId: {
        userId: session.user.id,
        parkId: park.id, // Use the actual database ID
      },
    },
  });

  if (existing) {
    return NextResponse.json({ error: "Already favorited" }, { status: 400 });
  }

  const favorite = await prisma.userFavorite.create({
    data: {
      userId: session.user.id,
      parkId: park.id, // Use the actual database ID
    },
  });

  return NextResponse.json({ success: true, favorite });
}
