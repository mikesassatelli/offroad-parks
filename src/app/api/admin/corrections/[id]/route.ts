import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, parseJsonBody } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

const patchSchema = z.object({
  status: z.enum(["RESOLVED", "DISMISSED"], {
    error: "status must be RESOLVED or DISMISSED",
  }),
});

// PATCH /api/admin/corrections/[id]
// Resolve or dismiss a free-text correction report. Mutating action → requireAdmin.
export async function PATCH(request: Request, { params }: RouteParams) {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  const { id } = await params;

  const parsed = await parseJsonBody(request, patchSchema);
  if ("response" in parsed) return parsed.response;

  const report = await prisma.parkCorrectionReport.findUnique({ where: { id } });
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const updated = await prisma.parkCorrectionReport.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({ success: true, report: updated });
}
