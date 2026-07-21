/**
 * ADD-ONLY promotion of verified parks from DEV → PROD.
 *
 * Safety design:
 *  - DEV (source)  = default PrismaClient (reads POSTGRES_PRISMA_URL from .env)
 *  - PROD (target) = separate client, url from PROD_POSTGRES_PRISMA_URL ONLY.
 *    If PROD_POSTGRES_PRISMA_URL is unset, the script refuses to run.
 *  - Never updates or deletes an existing prod row. For each park, if a prod
 *    park with the same name (case-insensitive) already exists, it is SKIPPED.
 *  - Copies only curated live fields (Park scalars + Address + terrain/amenities/
 *    camping/vehicleTypes). Research artifacts (DataSource/FieldExtraction/
 *    ResearchSession), photos, reviews, operator/submitter links, map-hero and
 *    review aggregates are NOT copied.
 *  - Dry-run by default. Pass --commit to actually write.
 *
 *  - Which parks: pass one or more exact park names as CLI args to promote just
 *    those; with no names it falls back to DEFAULT_PROMOTE (the Arkansas batch).
 *
 *   # preview the default batch (writes nothing):
 *   npx tsx --env-file=.env --env-file=.env.local scripts/promote-to-prod.ts
 *   # preview specific parks:
 *   npx tsx --env-file=.env --env-file=.env.local scripts/promote-to-prod.ts "River Valley OHV Park"
 *   # execute:
 *   npx tsx --env-file=.env --env-file=.env.local scripts/promote-to-prod.ts "River Valley OHV Park" --commit
 */
import { PrismaClient } from "@prisma/client";
import { prisma as dev } from "../src/lib/prisma";

// Default batch when no park names are passed on the CLI: the 15 verified,
// new-to-prod Arkansas parks (excludes the 3 known prod dupes: 3B/Eureka
// Springs Adventure Park, Hot Springs Off-Road Park, Wolf Pen Gap).
const DEFAULT_PROMOTE = [
  "Buckhorn OHV Trails",
  "Mill Creek OHV Trail",
  "Brock Creek Trails",
  "Wilderness Rider Buffalo Ranch & Adventure Park",
  "Bear Creek Cycle Trail",
  "Moccasin Gap OHV Trails",
  "Sugar Creek Multiuse Trail",
  "Fairfield Bay OHV Trails",
  "Mack's Pines Recreation Area",
  "The Ridge Off-Road Park",
  "Greasy Bend Off-Road Park",
  "Hillarosa ATV Park",
  "Carter Off Road Park",
  "RATS ATV & Off-Road Park",
  "Renegade Ranch",
  "Mulberry Mountain Lodging & Events",
];

// Park scalar fields copied verbatim (id/slug/timestamps/relations handled separately).
const PARK_SCALARS = [
  "name", "latitude", "longitude", "website", "phone", "campingWebsite", "campingPhone",
  "isFree", "dayPassUSD", "vehicleEntryFeeUSD", "riderFeeUSD", "membershipFeeUSD",
  "milesOfTrails", "acres", "notes", "datesOpen", "contactEmail", "ownership",
  "permitRequired", "permitType", "membershipRequired", "maxVehicleWidthInches",
  "flagsRequired", "sparkArrestorRequired", "helmetsRequired", "noiseLimitDBA",
  "dataCompletenessScore",
] as const;

const ADDRESS_SCALARS = [
  "streetAddress", "streetAddress2", "city", "state", "zipCode", "county", "latitude", "longitude",
] as const;

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function main() {
  const commit = process.argv.includes("--commit");
  const cliNames = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const PROMOTE = cliNames.length > 0 ? cliNames : DEFAULT_PROMOTE;
  const prodUrl = process.env.PROD_POSTGRES_URL ?? process.env.PROD_POSTGRES_PRISMA_URL;
  if (!prodUrl) {
    console.error(
      "\n✋ PROD_POSTGRES_URL is not set. Add it to .env / .env.local, e.g.\n" +
      "   PROD_POSTGRES_URL=postgresql://…prod pooled URL…\n" +
      "Refusing to run without an explicit prod target.\n",
    );
    process.exit(1);
  }
  const prod = new PrismaClient({ datasources: { db: { url: prodUrl } } });

  console.log(`\n${commit ? "🚀 COMMIT" : "🔎 DRY-RUN"} — promoting up to ${PROMOTE.length} parks DEV → PROD (add-only)\n`);

  const sources = await dev.park.findMany({
    where: { name: { in: PROMOTE } },
    include: { address: true, terrain: true, amenities: true, camping: true, vehicleTypes: true },
  });

  let created = 0, skipped = 0;
  for (const name of PROMOTE) {
    const src = sources.find((p) => p.name === name);
    if (!src) { console.log(`  ⚠️  "${name}" not found in dev — skipped`); continue; }

    const existing = await prod.park.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) { console.log(`  ⏭  SKIP (already in prod): ${name}`); skipped++; continue; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parkData: any = {};
    for (const f of PARK_SCALARS) parkData[f] = src[f as keyof typeof src];
    parkData.status = "APPROVED";
    parkData.researchStatus = src.researchStatus;

    const fieldCount =
      src.terrain.length + src.amenities.length + src.camping.length + src.vehicleTypes.length;
    const pct = Math.round(src.dataCompletenessScore ?? 0);
    if (!commit) {
      console.log(`  ➕ WOULD CREATE: ${name}  (${pct}%, ${src.address?.city ?? "?"}, ${src.address?.county ?? "?"}; ` +
        `veh/terr/amen/camp = ${fieldCount})`);
      created++;
      continue;
    }

    // Unique slug within prod.
    let slug = generateSlug(name), n = 1;
    while (await prod.park.findUnique({ where: { slug } })) slug = `${generateSlug(name)}-${++n}`;

    await prod.$transaction(async (tx) => {
      const park = await tx.park.create({ data: { ...parkData, slug } });
      if (src.address) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const addr: any = { parkId: park.id };
        const srcAddr = src.address;
        for (const f of ADDRESS_SCALARS) addr[f] = srcAddr[f as keyof typeof srcAddr];
        addr.state = src.address.state; // required
        await tx.address.create({ data: addr });
      }
      for (const t of src.terrain) await tx.parkTerrain.create({ data: { parkId: park.id, terrain: t.terrain } });
      for (const a of src.amenities) await tx.parkAmenity.create({ data: { parkId: park.id, amenity: a.amenity } });
      for (const c of src.camping) await tx.parkCamping.create({ data: { parkId: park.id, camping: c.camping } });
      for (const v of src.vehicleTypes) await tx.parkVehicleType.create({ data: { parkId: park.id, vehicleType: v.vehicleType } });
    });
    console.log(`  ✅ CREATED: ${name}  →  /parks/${slug}  (${pct}%)`);
    created++;
  }

  console.log(`\n${commit ? "Promoted" : "Would promote"} ${created} park(s); skipped ${skipped} already in prod.`);
  if (!commit) console.log(`Re-run with --commit to write to prod.\n`);
  await dev.$disconnect();
  await prod.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
