import { NextResponse } from "next/server";
import { getOperatorContext } from "@/lib/operator-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ parkSlug: string; photoId: string }>;
};

const ALLOWED_STATUSES = new Set(["PENDING", "APPROVED", "REJECTED"]);

// PATCH /api/operator/parks/[parkSlug]/photos/[photoId]
// Operator moderates a photo for their park (status only — not parkId reassignment).
export async function PATCH(request: Request, { params }: RouteParams) {
  const { parkSlug, photoId } = await params;

  const ctx = await getOperatorContext(parkSlug);
  if (!ctx) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { status } = body;
  if (!status || !ALLOWED_STATUSES.has(status)) {
    return NextResponse.json(
      { error: "status must be PENDING, APPROVED, or REJECTED" },
      { status: 400 },
    );
  }

  const photo = await prisma.parkPhoto.findUnique({ where: { id: photoId } });
  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  if (photo.parkId !== ctx.parkId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.parkPhoto.update({
    where: { id: photoId },
    data: { status: status as "PENDING" | "APPROVED" | "REJECTED" },
  });

  return NextResponse.json(updated);
}

// DELETE /api/operator/parks/[parkSlug]/photos/[photoId]
// Operator deletes a photo belonging to their park.
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { parkSlug, photoId } = await params;

  const ctx = await getOperatorContext(parkSlug);
  if (!ctx) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const photo = await prisma.parkPhoto.findUnique({ where: { id: photoId } });
  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  if (photo.parkId !== ctx.parkId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.parkPhoto.delete({ where: { id: photoId } });

  return NextResponse.json({ success: true, deletedId: photoId });
}
