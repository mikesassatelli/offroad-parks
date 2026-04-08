import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ jobId: string }> };

// POST — Abort a running bulk research job
export async function POST(_request: Request, { params }: RouteParams) {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  const { jobId } = await params;

  const job = await prisma.bulkResearchJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status !== "QUEUED" && job.status !== "RUNNING") {
    return NextResponse.json(
      { error: `Cannot abort job with status ${job.status}` },
      { status: 400 }
    );
  }

  await prisma.bulkResearchJob.update({
    where: { id: jobId },
    data: { status: "ABORTED" },
  });

  return NextResponse.json({ success: true });
}
