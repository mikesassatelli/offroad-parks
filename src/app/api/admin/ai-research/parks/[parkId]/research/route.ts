import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { researchPark } from "@/lib/ai/research-pipeline";

type RouteParams = { params: Promise<{ parkId: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  const { parkId } = await params;

  // Import prisma to verify park exists
  const { prisma } = await import("@/lib/prisma");
  const park = await prisma.park.findUnique({ where: { id: parkId } });
  if (!park) {
    return NextResponse.json({ error: "Park not found" }, { status: 404 });
  }

  try {
    const { sessionId } = await researchPark(parkId, "ADMIN_MANUAL");
    return NextResponse.json({ success: true, sessionId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Research failed" },
      { status: 500 }
    );
  }
}
