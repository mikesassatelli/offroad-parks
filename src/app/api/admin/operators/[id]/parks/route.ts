/**
 * POST — attach a park (by slug) to an operator account. Fails if the
 * park already has a different operator.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

interface AttachParkBody {
  parkSlug?: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  const { id: operatorId } = await params;

  let body: AttachParkBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const slug = body.parkSlug?.trim();
  if (!slug) {
    return NextResponse.json(
      { error: "parkSlug is required" },
      { status: 400 },
    );
  }

  const operator = await prisma.operator.findUnique({
    where: { id: operatorId },
    select: { id: true },
  });
  if (!operator) {
    return NextResponse.json({ error: "Operator not found" }, { status: 404 });
  }

  const park = await prisma.park.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, operatorId: true },
  });
  if (!park) {
    return NextResponse.json(
      { error: `Park '${slug}' not found` },
      { status: 404 },
    );
  }

  if (park.operatorId === operatorId) {
    // Already attached — idempotent.
    return NextResponse.json({ park });
  }

  if (park.operatorId) {
    return NextResponse.json(
      {
        error: `Park '${slug}' is already owned by another operator. Detach it from that operator first.`,
      },
      { status: 409 },
    );
  }

  const updated = await prisma.park.update({
    where: { id: park.id },
    data: { operatorId },
    select: { id: true, slug: true, name: true, operatorId: true },
  });

  // ISR bust — park detail header rendering reads operator.
  revalidatePath("/");
  revalidatePath(`/parks/${slug}`);

  return NextResponse.json({ park: updated }, { status: 201 });
}
