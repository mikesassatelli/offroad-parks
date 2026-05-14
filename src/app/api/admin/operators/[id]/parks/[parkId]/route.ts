/**
 * DELETE — detach a park from an operator. Sets Park.operatorId to null;
 * the park is preserved.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; parkId: string }> },
): Promise<NextResponse> {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  const { id: operatorId, parkId } = await params;

  const park = await prisma.park.findUnique({
    where: { id: parkId },
    select: { id: true, slug: true, operatorId: true },
  });
  if (!park) {
    return NextResponse.json({ error: "Park not found" }, { status: 404 });
  }
  if (park.operatorId !== operatorId) {
    return NextResponse.json(
      { error: "Park is not attached to this operator" },
      { status: 409 },
    );
  }

  await prisma.park.update({
    where: { id: parkId },
    data: { operatorId: null },
  });

  revalidatePath("/");
  revalidatePath(`/parks/${park.slug}`);

  return NextResponse.json({ success: true });
}
