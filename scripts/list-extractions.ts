/**
 * Dump PENDING_REVIEW field extractions per park as JSON (dev DB — targets .env).
 * Feeds the per-park verification agents. Read-only.
 *
 *   npx tsx --env-file=.env --env-file=.env.local scripts/list-extractions.ts Arkansas
 *   ... > /tmp/ar-extractions.json
 */
import { prisma } from "../src/lib/prisma";
import { normalizeStateName } from "../src/lib/us-states";

async function main() {
  const canonicalState = normalizeStateName(process.argv[2] ?? "Arkansas");
  if (!canonicalState) process.exit(1);

  const parks = await prisma.park.findMany({
    where: { address: { state: canonicalState } },
    select: {
      id: true,
      name: true,
      slug: true,
      latitude: true,
      longitude: true,
      address: { select: { city: true, state: true } },
      fieldExtractions: {
        where: { status: "PENDING_REVIEW" },
        select: {
          id: true,
          fieldName: true,
          extractedValue: true,
          confidenceScore: true,
          dataSource: { select: { url: true } },
        },
        orderBy: { fieldName: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const out = parks.map((p) => ({
    parkId: p.id,
    name: p.name,
    slug: p.slug,
    city: p.address?.city ?? null,
    state: p.address?.state ?? null,
    coords: p.latitude != null && p.longitude != null ? [p.latitude, p.longitude] : null,
    pendingFields: p.fieldExtractions.map((e) => ({
      id: e.id,
      field: e.fieldName,
      value: e.extractedValue ? JSON.parse(e.extractedValue) : null,
      confidence: e.confidenceScore,
      sourceUrl: e.dataSource?.url ?? null,
    })),
  }));

  console.log(JSON.stringify(out, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
