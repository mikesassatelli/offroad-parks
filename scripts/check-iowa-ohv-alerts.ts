/**
 * Read-only preview of the Iowa DNR OHV alerts cron. Fetches the live alerts
 * page and shows how each alert matches against the Iowa parks already in the
 * DB — WITHOUT writing anything. Run this against prod (or dev) to confirm the
 * daily cron will attach alerts to the right parks before it runs for real.
 *
 *   npx tsx --env-file=.env --env-file=.env.local scripts/check-iowa-ohv-alerts.ts
 *
 * Reads POSTGRES_* from the env files, same as the other db:* scripts. No
 * mutations, no bot user created — safe to run against production.
 */
import { prisma } from "../src/lib/prisma";
import { fetchIowaOhvAlerts } from "../src/lib/iowa-ohv/parse";
import { matchPark } from "../src/lib/iowa-ohv/sync";

async function main() {
  const iowaParks = await prisma.park.findMany({
    where: {
      status: "APPROVED",
      address: { state: { in: ["Iowa", "IA"] } },
    },
    select: { id: true, name: true, address: { select: { county: true } } },
    orderBy: { name: "asc" },
  });

  console.log(`\n🏞  Approved Iowa parks in DB: ${iowaParks.length}`);
  for (const p of iowaParks) {
    console.log(`   • ${p.name}${p.address?.county ? `  (${p.address.county})` : ""}`);
  }

  const alerts = await fetchIowaOhvAlerts();
  console.log(`\n🚨 Live alerts on the Iowa DNR page: ${alerts.length}\n`);

  let matched = 0;
  const unmatched: string[] = [];
  for (const a of alerts) {
    const park = matchPark(a, iowaParks);
    if (park) {
      matched++;
      console.log(`   ✅ "${a.parkName}" (${a.county}) → ${park.name}  [${a.statusLabel}]`);
    } else {
      unmatched.push(a.parkName);
      console.log(`   ❌ "${a.parkName}" (${a.county}) → NO MATCH  [${a.statusLabel}]`);
    }
  }

  console.log(`\nSummary: ${matched}/${alerts.length} matched.`);
  if (unmatched.length) {
    console.log(
      `Unmatched: ${unmatched.join(", ")}\n` +
        `  → If a park above IS in the DB list, the names differ too much — rename\n` +
        `    the park or widen matching. If it's genuinely absent, seed it\n` +
        `    (scripts/data/iowa-ohv-parks.json) — but check for near-duplicates first.`
    );
  } else if (alerts.length) {
    console.log("All live alerts matched a park. The cron is good to go. 🎉");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
