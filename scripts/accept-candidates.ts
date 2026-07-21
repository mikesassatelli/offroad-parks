/**
 * Seed accepted ParkCandidate rows into real Park records (dev DB — targets .env).
 * Ports the candidate-accept transaction from
 * src/app/api/admin/ai-research/discovery/candidates/route.ts (route-only logic).
 *
 * Does NOT auto-trigger research (run research-parks.ts separately for cost control)
 * and does NOT generate map heroes.
 *
 * Run (dry-run — lists PENDING candidates, seeds nothing):
 *   npx tsx --env-file=.env --env-file=.env.local scripts/accept-candidates.ts Arkansas
 *
 * Run (seed only the matching candidates; match = case-insensitive substring):
 *   npx tsx --env-file=.env --env-file=.env.local scripts/accept-candidates.ts Arkansas \
 *     --accept "Hot Springs Off Road||Wolf Pen Gap||Mill Creek||Buckhorn||3B Off-Road"
 */
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { normalizeStateName } from "../src/lib/us-states";

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

async function main() {
  const stateArg = process.argv[2] ?? "Arkansas";
  const canonicalState = normalizeStateName(stateArg);
  if (!canonicalState) {
    console.error(`Unrecognized state: ${stateArg}`);
    process.exit(1);
  }

  // --file <json>: [{ "match": "<substr of candidate name>", "name": "<canonical>", "city": "<city>" }]
  const fileIdx = process.argv.indexOf("--file");
  const acceptList: { match: string; name: string; city?: string }[] | null =
    fileIdx !== -1 && process.argv[fileIdx + 1]
      ? JSON.parse(readFileSync(process.argv[fileIdx + 1], "utf8"))
      : null;

  const pending = await prisma.parkCandidate.findMany({
    where: { state: canonicalState, status: "PENDING" },
    orderBy: { name: "asc" },
  });

  console.log(`\n${pending.length} PENDING candidate(s) in ${canonicalState}:\n`);

  if (!acceptList) {
    pending.forEach((c) => console.log(`  —  ${c.name}${c.city ? ` (${c.city})` : ""}`));
    console.log(
      `\n(dry-run) Pass --file <accept.json> with [{match,name,city}] to seed.\n`,
    );
    await prisma.$disconnect();
    return;
  }

  console.log(`Seeding ${acceptList.length} vetted park(s) → Park records...\n`);
  for (const entry of acceptList) {
    const candidate = pending.find((c) =>
      c.name.toLowerCase().includes(entry.match.toLowerCase()),
    );
    if (!candidate) {
      console.log(`  ⚠️  no PENDING candidate matches "${entry.match}" — skipped`);
      continue;
    }
    const slug = await ensureUniqueSlug(generateSlug(entry.name));
    const result = await prisma.$transaction(async (tx) => {
      const park = await tx.park.create({
        data: {
          name: entry.name, // canonical, verified name
          slug,
          status: "APPROVED",
          researchStatus: "NEEDS_RESEARCH",
          latitude: candidate.estimatedLat,
          longitude: candidate.estimatedLng,
        },
      });
      await tx.address.create({
        data: { parkId: park.id, state: canonicalState, city: entry.city ?? candidate.city },
      });
      await tx.parkCandidate.update({
        where: { id: candidate.id },
        data: { status: "ACCEPTED", seededParkId: park.id },
      });
      return park;
    });
    console.log(`  ✅ ${entry.name}  →  /parks/${result.slug}  (${result.id})`);
  }

  console.log(`\nDone. Seeded ${acceptList.length} park(s), all status=APPROVED researchStatus=NEEDS_RESEARCH.`);
  console.log(`Next: research them with scripts/research-parks.ts\n`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
