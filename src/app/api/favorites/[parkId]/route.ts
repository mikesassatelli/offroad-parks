import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    parkId: string;
  }>;
};

// DELETE /api/favorites/[parkId] - Remove a favorite
export async function DELETE(
  _request: Request,
  { params }: RouteParams,
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { parkId } = await params;

  // The frontend sends the slug as parkId, so we need to look up the park first
  const park = await prisma.park.findUnique({
    where: { slug: parkId },
  });

  if (!park) {
    return NextResponse.json({ error: "Park not found" }, { status: 404 });
  }

  const favorite = await prisma.userFavorite.findUnique({
    where: {
      userId_parkId: {
        userId: session.user.id,
        parkId: park.id, // Use the actual database ID
      },
    },
  });

  if (!favorite) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.userFavorite.delete({
    where: { id: favorite.id },
  });

  return NextResponse.json({ success: true });
}
