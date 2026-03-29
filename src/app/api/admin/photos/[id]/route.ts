import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// PATCH /api/admin/photos/[id] — reassign a photo to a different parkId
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = (session.user as { role?: string })?.role;
  if (userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: { parkId?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { parkId, status } = body;

  if (!parkId && !status) {
    return NextResponse.json(
      { error: "At least one of parkId or status is required" },
      { status: 400 },
    );
  }

  // Verify the photo exists
  const photo = await prisma.parkPhoto.findUnique({ where: { id } });
  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  // If reassigning to a new park, verify that park exists
  if (parkId && parkId !== photo.parkId) {
    const park = await prisma.park.findUnique({ where: { id: parkId } });
    if (!park) {
      return NextResponse.json(
        { error: `Park ${parkId} not found` },
        { status: 404 },
      );
    }
  }

  const updated = await prisma.parkPhoto.update({
    where: { id },
    data: {
      ...(parkId ? { parkId } : {}),
      ...(status ? { status: status as "PENDING" | "APPROVED" | "REJECTED" } : {}),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/admin/photos/[id] — remove a mis-assigned or duplicate photo record
// NOTE: This only deletes the DB record. The Vercel Blob file is NOT deleted,
// since the same URL may be correctly referenced by another park record.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = (session.user as { role?: string })?.role;
  if (userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const photo = await prisma.parkPhoto.findUnique({ where: { id } });
  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  await prisma.parkPhoto.delete({ where: { id } });

  return NextResponse.json({ success: true, deletedId: id });
}
