/**
 * Admin map-hero backfill endpoint (OP-90).
 *
 * POST: process a batch of parks missing `mapHeroUrl`. Called in a loop
 * from the admin UI until no more parks need heroes.
 *
 * We intentionally process sequentially rather than in parallel — a bulk
 * parallel burst would hit Mapbox rate limits and it's not worth the extra
 * code for a one-time-per-park operation that runs at admin pace.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { generateMapHero } from "@/lib/map-hero/generate";

export const runtime = "nodejs";

// Max runtime is ~1s per park (Mapbox + Blob + Prisma). Vercel Hobby is
// capped at 10s per function; Pro is 60s. Batch size of 8 gives us
// headroom on Hobby and stays comfortably under Pro's limit.
const DEFAULT_BATCH_SIZE = 8;

type BackfillFailure = { parkId: string; parkName: string; reason: string };

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  const body = await request.json().catch(() => ({}));
  const batchSize =
    typeof body.batchSize === "number" && body.batchSize > 0 && body.batchSize <= 25
      ? body.batchSize
      : DEFAULT_BATCH_SIZE;

  // Pull the next batch of parks that still need a map hero. Only consider
  // parks that have at least one coord source to avoid generating "no
  // coordinates" failures on every call.
  const parks = await prisma.park.findMany({
    where: {
      mapHeroUrl: null,
      OR: [
        { latitude: { not: null } },
        { address: { latitude: { not: null } } },
      ],
    },
    select: { id: true, name: true },
    take: batchSize,
  });

  let succeeded = 0;
  const failures: BackfillFailure[] = [];

  for (const park of parks) {
    const result = await generateMapHero(park.id);
    if (result.ok) {
      succeeded += 1;
    } else {
      failures.push({ parkId: park.id, parkName: park.name, reason: result.reason });
    }
  }

  // Compute remaining count (includes parks without coords — admin UI can
  // show the delta separately if it cares).
  const remaining = await prisma.park.count({
    where: {
      mapHeroUrl: null,
      OR: [
        { latitude: { not: null } },
        { address: { latitude: { not: null } } },
      ],
    },
  });

  return NextResponse.json({
    processed: parks.length,
    succeeded,
    failed: failures.length,
    failures,
    remaining,
  });
}
