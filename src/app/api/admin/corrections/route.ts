import { NextResponse } from "next/server";
import { requireAdminView } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/admin/corrections
// Lists free-text park correction reports for admin triage. Defaults to PENDING;
// pass ?status=RESOLVED or ?status=DISMISSED to view actioned reports.
// Read-only admin viewers (beta testers) may browse.
export async function GET(request: Request) {
  const viewer = await requireAdminView();
  if (viewer instanceof NextResponse) return viewer;

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const validStatuses = ["PENDING", "RESOLVED", "DISMISSED"] as const;
  const status = (validStatuses as readonly string[]).includes(statusParam ?? "")
    ? (statusParam as (typeof validStatuses)[number])
    : "PENDING";

  const reports = await prisma.parkCorrectionReport.findMany({
    where: { status },
    include: {
      park: { select: { id: true, name: true, slug: true } },
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ reports });
}
