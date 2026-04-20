import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { researchPark } from "@/lib/ai/research-pipeline";
import { generateMapHeroAsync } from "@/lib/map-hero/generate";
import { normalizeStateName } from "@/lib/us-states";
import type { ParkCandidateStatus, ParkCandidateSummary } from "@/lib/types";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const existing = await prisma.park.findUnique({ where: { slug } });
    if (!existing) return slug;
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

// GET — List ParkCandidate records
export async function GET(request: Request) {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "PENDING";
  const state = searchParams.get("state");

  const where: { status?: ParkCandidateStatus; state?: string } = {};
  if (status && status !== "ALL") {
    where.status = status as ParkCandidateStatus;
  }
  if (state) {
    // Candidate rows now store canonical full state names ("Arkansas"), but
    // callers may still pass either a 2-letter code or a full name. Normalize
    // defensively; fall back to the raw value so unknown inputs still produce
    // an empty result rather than silently ignoring the filter.
    where.state = normalizeStateName(state) ?? state;
  }

  const [candidates, total] = await Promise.all([
    prisma.parkCandidate.findMany({
      where,
      orderBy: [{ state: "asc" }, { name: "asc" }],
    }),
    prisma.parkCandidate.count({ where }),
  ]);

  const summaries: ParkCandidateSummary[] = candidates.map((c) => ({
    id: c.id,
    name: c.name,
    state: c.state,
    city: c.city,
    estimatedLat: c.estimatedLat,
    estimatedLng: c.estimatedLng,
    sourceUrl: c.sourceUrl,
    status: c.status as ParkCandidateStatus,
    rejectedReason: c.rejectedReason,
    seededParkId: c.seededParkId,
    createdAt: c.createdAt.toISOString(),
  }));

  return NextResponse.json({ candidates: summaries, total });
}

// PATCH — Accept or reject a candidate
export async function PATCH(request: Request) {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  let body: { candidateId?: string; action?: string; rejectedReason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { candidateId, action, rejectedReason } = body;

  if (!candidateId || !action) {
    return NextResponse.json(
      { error: "candidateId and action are required" },
      { status: 400 }
    );
  }

  if (action !== "accept" && action !== "reject") {
    return NextResponse.json(
      { error: "action must be 'accept' or 'reject'" },
      { status: 400 }
    );
  }

  const candidate = await prisma.parkCandidate.findUnique({
    where: { id: candidateId },
  });

  if (!candidate) {
    return NextResponse.json(
      { error: "Candidate not found" },
      { status: 404 }
    );
  }

  if (candidate.status !== "PENDING") {
    return NextResponse.json(
      { error: `Candidate is already ${candidate.status}` },
      { status: 400 }
    );
  }

  if (action === "reject") {
    await prisma.parkCandidate.update({
      where: { id: candidateId },
      data: {
        status: "REJECTED",
        rejectedReason: rejectedReason || null,
      },
    });
    return NextResponse.json({ success: true });
  }

  // action === "accept"
  // Defensive normalization: old candidates created before state normalization
  // may still have 2-letter codes stored. Reject rather than silently seed a
  // park with a bad state value.
  const canonicalState = normalizeStateName(candidate.state);
  if (!canonicalState) {
    return NextResponse.json(
      {
        error: `Candidate has an unrecognizable state value: "${candidate.state}". Fix the candidate record before accepting.`,
      },
      { status: 400 }
    );
  }

  try {
    const slug = await ensureUniqueSlug(generateSlug(candidate.name));

    const result = await prisma.$transaction(async (tx) => {
      const park = await tx.park.create({
        data: {
          name: candidate.name,
          slug,
          status: "APPROVED",
          researchStatus: "NEEDS_RESEARCH",
          latitude: candidate.estimatedLat,
          longitude: candidate.estimatedLng,
        },
      });

      await tx.address.create({
        data: {
          parkId: park.id,
          state: canonicalState,
          city: candidate.city,
        },
      });

      await tx.parkCandidate.update({
        where: { id: candidateId },
        data: {
          status: "ACCEPTED",
          seededParkId: park.id,
        },
      });

      return { parkId: park.id, parkSlug: park.slug };
    });

    // Fire-and-forget: trigger research on the new park
    researchPark(result.parkId, "NEW_PARK_SEEDED").catch((err) => {
      console.error(
        `[discovery] Failed to start research for park ${result.parkId}:`,
        err
      );
    });

    // Fire-and-forget: generate map hero thumbnail (OP-90). Candidate coords
    // come from discovery and are stored on the Park record, so this should
    // succeed for all approved candidates.
    generateMapHeroAsync(result.parkId, "discovery-accept");

    return NextResponse.json({
      success: true,
      parkId: result.parkId,
      parkSlug: result.parkSlug,
    });
  } catch (error) {
    console.error("[discovery] Error accepting candidate:", error);
    return NextResponse.json(
      { error: "Failed to accept candidate" },
      { status: 500 }
    );
  }
}
