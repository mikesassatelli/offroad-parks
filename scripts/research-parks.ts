/**
 * Run the AI research pipeline on seeded parks (dev DB — targets .env).
 * Calls researchPark() per park; it writes DataSource + FieldExtraction (a
 * PENDING_REVIEW queue) — it does NOT write live park field values. Safe.
 *
 * Costs SerpApi + Anthropic per park. Run with ANTHROPIC_BASE_URL unset locally:
 *   env -u ANTHROPIC_BASE_URL npx tsx --env-file=.env --env-file=.env.local \
 *     scripts/research-parks.ts Arkansas
 *
 * By default researches every NEEDS_RESEARCH/IN_PROGRESS park in the state.
 * Pass --limit N to cap the batch.
 */
import { prisma } from "../src/lib/prisma";
import { researchPark } from "../src/lib/ai/research-pipeline";
import { normalizeStateName } from "../src/lib/us-states";

async function main() {
  const stateArg = process.argv[2] ?? "Arkansas";
  const canonicalState = normalizeStateName(stateArg);
  if (!canonicalState) {
    console.error(`Unrecognized state: ${stateArg}`);
    process.exit(1);
  }
  const limitIdx = process.argv.indexOf("--limit");
  const limit =
    limitIdx !== -1 && process.argv[limitIdx + 1]
      ? parseInt(process.argv[limitIdx + 1], 10)
      : undefined;

  // --only "<substr>": research just parks whose name contains this (case-insensitive),
  // regardless of researchStatus. For targeted (re-)research of a single park.
  const onlyIdx = process.argv.indexOf("--only");
  const only = onlyIdx !== -1 ? process.argv[onlyIdx + 1] : undefined;

  const parks = await prisma.park.findMany({
    where: {
      address: { state: canonicalState },
      ...(only
        ? { name: { contains: only, mode: "insensitive" } }
        : { researchStatus: { in: ["NEEDS_RESEARCH", "IN_PROGRESS"] } }),
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
    take: limit,
  });

  console.log(`\nResearching ${parks.length} park(s) in ${canonicalState} (sequential)...\n`);

  let totalCost = 0;
  for (let i = 0; i < parks.length; i++) {
    const p = parks[i];
    process.stdout.write(`  [${i + 1}/${parks.length}] ${p.name} ... `);
    try {
      const { sessionId } = await researchPark(p.id, "ADMIN_MANUAL");
      const session = await prisma.researchSession.findUnique({
        where: { id: sessionId },
        select: { estimatedCostUSD: true, status: true },
      });
      const cost = session?.estimatedCostUSD ?? 0;
      totalCost += cost;
      const extractions = await prisma.fieldExtraction.count({
        where: { sessionId, status: "PENDING_REVIEW" },
      });
      console.log(`done ($${cost.toFixed(3)}, ${extractions} fields to review)`);
    } catch (err) {
      console.log(`FAILED: ${(err as Error).message?.slice(0, 100)}`);
    }
  }

  console.log(`\nTotal research cost: ~$${totalCost.toFixed(2)} (+ SerpApi credits).`);
  console.log(`Next: review pending extractions and approve verified fields.\n`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
