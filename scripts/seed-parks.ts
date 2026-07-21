/**
 * Seed Park records directly from a vetted JSON list (dev DB — targets .env).
 * For adding specific, already-canonicalized parks (not from the ParkCandidate
 * discovery queue). Add-only: skips any park whose name already exists.
 *
 * Input JSON: [{ "name": "...", "city": "...", "county": "...",
 *                "lat": <num|null>, "lng": <num|null>, "url": "..." }]
 *
 *   npx tsx --env-file=.env --env-file=.env.local scripts/seed-parks.ts Arkansas /tmp/ar-more.json
 */
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { normalizeStateName } from "../src/lib/us-states";

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base, n = 1;
  while (await prisma.park.findUnique({ where: { slug } })) slug = `${base}-${++n}`;
  return slug;
}

type Entry = { name: string; city?: string; county?: string; lat?: number | null; lng?: number | null; url?: string };

async function main() {
  const canonicalState = normalizeStateName(process.argv[2] ?? "Arkansas");
  const file = process.argv[3];
  if (!canonicalState || !file) {
    console.error("Usage: seed-parks.ts <state> <list.json>");
    process.exit(1);
  }
  const entries: Entry[] = JSON.parse(readFileSync(file, "utf8"));

  console.log(`\nSeeding ${entries.length} park(s) into ${canonicalState} (add-only)...\n`);
  let seeded = 0;
  for (const e of entries) {
    const dupe = await prisma.park.findFirst({
      where: { name: { equals: e.name, mode: "insensitive" } },
      select: { id: true },
    });
    if (dupe) {
      console.log(`  ⏭  "${e.name}" already exists — skipped`);
      continue;
    }
    const slug = await ensureUniqueSlug(generateSlug(e.name));
    const park = await prisma.$transaction(async (tx) => {
      const p = await tx.park.create({
        data: {
          name: e.name,
          slug,
          status: "APPROVED",
          researchStatus: "NEEDS_RESEARCH",
          latitude: e.lat ?? null,
          longitude: e.lng ?? null,
          website: e.url ?? null,
        },
      });
      await tx.address.create({
        data: { parkId: p.id, state: canonicalState, city: e.city ?? null, county: e.county ?? null },
      });
      // Pre-seed the official URL as a trusted DataSource so research fetches
      // it first (avoids the "0 fields" empty-research problem).
      if (e.url) {
        await tx.dataSource.create({
          data: {
            parkId: p.id,
            url: e.url,
            title: `${e.name} (official)`,
            origin: "ADMIN_ADDED",
            isOfficial: true,
            reliability: 80,
          },
        });
      }
      return p;
    });
    console.log(`  ✅ ${e.name}  →  /parks/${park.slug}  (${park.id})`);
    seeded++;
  }
  console.log(`\nSeeded ${seeded}/${entries.length} new park(s). Next: research-parks.ts\n`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
