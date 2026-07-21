/**
 * AI park discovery for a US state (dev DB — targets .env).
 *
 * Run:
 *   npx tsx --env-file=.env --env-file=.env.local scripts/discover-state.ts Arkansas
 *
 * Costs SerpApi + Anthropic (a few cents). Writes PENDING rows to ParkCandidate.
 * Does NOT create Park records or touch live data.
 */
import { discoverParksInState } from "../src/lib/ai/park-discovery";
import { normalizeStateName } from "../src/lib/us-states";
import { prisma } from "../src/lib/prisma";

async function main() {
  const stateArg = process.argv[2] ?? "Arkansas";
  const state = normalizeStateName(stateArg);
  if (!state) {
    console.error(`Unrecognized state: ${stateArg}`);
    process.exit(1);
  }

  console.log(`\n🔎 Discovering OHV/offroad parks in ${state}...\n`);
  const result = await discoverParksInState(state);

  const inCost = (result.inputTokens / 1_000_000) * 3;
  const outCost = (result.outputTokens / 1_000_000) * 15;
  console.log(
    `LLM tokens: ${result.inputTokens} in / ${result.outputTokens} out  (~$${(inCost + outCost).toFixed(4)} + SerpApi credits)\n`,
  );

  console.log(`Returned ${result.candidates.length} candidate(s):\n`);
  result.candidates.forEach((c, i) => {
    const coords =
      c.estimatedLat != null && c.estimatedLng != null
        ? `${c.estimatedLat.toFixed(3)}, ${c.estimatedLng.toFixed(3)}`
        : "no coords";
    console.log(
      `  ${String(i + 1).padStart(2)}. ${c.name}${c.city ? ` — ${c.city}` : ""}  [${coords}]`,
    );
    if (c.sourceUrl) console.log(`      src: ${c.sourceUrl}`);
  });

  const persisted = await prisma.parkCandidate.findMany({
    where: { state },
    orderBy: { name: "asc" },
    select: { name: true, city: true, status: true, sourceUrl: true },
  });
  console.log(`\n💾 ParkCandidate rows now in DB for ${state}: ${persisted.length}`);
  persisted.forEach((c) =>
    console.log(`   [${c.status}] ${c.name}${c.city ? ` (${c.city})` : ""}`),
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
