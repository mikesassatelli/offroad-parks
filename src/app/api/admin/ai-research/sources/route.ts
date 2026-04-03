import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import type { DataSourceSummary } from "@/lib/types";
import { normalizeUrl } from "@/lib/ai/source-discovery";

export async function GET(request: Request) {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  const url = new URL(request.url);
  const parkId = url.searchParams.get("parkId");

  if (!parkId) {
    return NextResponse.json({ error: "parkId is required" }, { status: 400 });
  }

  const sources = await prisma.dataSource.findMany({
    where: { parkId },
    orderBy: [{ reliability: "desc" }, { createdAt: "desc" }],
  });

  const results: DataSourceSummary[] = sources.map((s) => ({
    id: s.id,
    parkId: s.parkId,
    url: s.url,
    type: s.type,
    origin: s.origin,
    title: s.title,
    reliability: s.reliability,
    isOfficial: s.isOfficial,
    lastCrawledAt: s.lastCrawledAt?.toISOString() ?? null,
    contentChanged: s.contentChanged,
    crawlStatus: s.crawlStatus,
    crawlError: s.crawlError,
    createdAt: s.createdAt.toISOString(),
  }));

  return NextResponse.json({ sources: results });
}

export async function POST(request: Request) {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  const body = await request.json();
  const { parkId, url: rawUrl, type, isOfficial } = body;

  if (!parkId || !rawUrl) {
    return NextResponse.json({ error: "parkId and url are required" }, { status: 400 });
  }

  // Validate URL
  try {
    new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Verify park exists
  const park = await prisma.park.findUnique({ where: { id: parkId } });
  if (!park) {
    return NextResponse.json({ error: "Park not found" }, { status: 404 });
  }

  const normalizedUrl = normalizeUrl(rawUrl);

  // Check for duplicates
  const existing = await prisma.dataSource.findUnique({
    where: { parkId_url: { parkId, url: normalizedUrl } },
  });
  if (existing) {
    return NextResponse.json({ error: "Source URL already exists for this park" }, { status: 409 });
  }

  const source = await prisma.dataSource.create({
    data: {
      parkId,
      url: normalizedUrl,
      type: type || "website",
      origin: "ADMIN_ADDED",
      isOfficial: isOfficial || false,
    },
  });

  return NextResponse.json({ success: true, source });
}

export async function PATCH(request: Request) {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  const body = await request.json();
  const { sourceId, action, reliability } = body;

  if (!sourceId) {
    return NextResponse.json({ error: "sourceId is required" }, { status: 400 });
  }

  const source = await prisma.dataSource.findUnique({ where: { id: sourceId } });
  if (!source) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};

  // Skip source — sets crawlStatus to SKIPPED so it won't be crawled again
  if (action === "skip") {
    updateData.crawlStatus = "SKIPPED";
  }
  // Unskip — restore to PENDING so it will be crawled on next run
  else if (action === "unskip") {
    updateData.crawlStatus = "PENDING";
  }
  // Trust — mark as official and boost reliability to 90
  else if (action === "trust") {
    updateData.isOfficial = true;
    updateData.reliability = 90;
  }
  // Untrust — remove official status and reset reliability to 50
  else if (action === "untrust") {
    updateData.isOfficial = false;
    updateData.reliability = 50;
  }
  // Set reliability directly
  else if (reliability !== undefined) {
    updateData.reliability = Math.max(0, Math.min(100, Number(reliability)));
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const updated = await prisma.dataSource.update({
    where: { id: sourceId },
    data: updateData,
  });

  return NextResponse.json({ success: true, source: updated });
}
