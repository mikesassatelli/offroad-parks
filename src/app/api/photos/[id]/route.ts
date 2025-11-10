import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

// DELETE /api/photos/[id] - Delete a photo
export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Find the photo
  const photo = await prisma.parkPhoto.findUnique({
    where: { id },
  });

  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  // Check if user is authorized (photo owner or admin)
  const userRole = (session.user as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN";
  const isOwner = photo.userId === session.user.id;

  if (!isAdmin && !isOwner) {
    return NextResponse.json(
      { error: "You don't have permission to delete this photo" },
      { status: 403 },
    );
  }

  try {
    // Delete from Vercel Blob
    await del(photo.url);

    // Delete from database
    await prisma.parkPhoto.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete photo:", error);
    return NextResponse.json(
      { error: "Failed to delete photo" },
      { status: 500 },
    );
  }
}
