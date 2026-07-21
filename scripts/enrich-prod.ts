/**
 * ADD-ONLY field-level enrichment of existing PROD parks from their verified
 * DEV twins. Fills only EMPTY prod scalar/address fields and UNIONS array
 * fields — never overwrites an existing prod value.
 *
 *  - DEV (source) = default PrismaClient (POSTGRES_PRISMA_URL, .env)
 *  - PROD (target) = PROD_POSTGRES_URL (required; refuses to run otherwise)
 *  - Mapping JSON: [{ "devName": "...", "prodName": "..." }]  (identity-confirmed pairs only)
 *  - Dry-run by default; --commit to write.
 *
 *   npx tsx --env-file=.env --env-file=.env.local scripts/enrich-prod.ts /tmp/dupe-map.json
 *   npx tsx --env-file=.env --env-file=.env.local scripts/enrich-prod.ts /tmp/dupe-map.json --commit
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { prisma as dev } from "../src/lib/prisma";
import { calculateCompleteness } from "../src/lib/ai/research-lifecycle";
import type { DbPark } from "../src/lib/types";

const FILL_SCALARS = [
  "latitude", "longitude", "website", "phone", "campingWebsite", "campingPhone",
  "isFree", "dayPassUSD", "vehicleEntryFeeUSD", "riderFeeUSD", "membershipFeeUSD",
  "milesOfTrails", "acres", "notes", "datesOpen", "contactEmail", "ownership",
  "permitRequired", "permitType", "membershipRequired", "maxVehicleWidthInches",
  "flagsRequired", "sparkArrestorRequired", "helmetsRequired", "noiseLimitDBA",
] as const;
const FILL_ADDRESS = ["streetAddress", "streetAddress2", "city", "zipCode", "county", "latitude", "longitude"] as const;
const ARRAY_DEFS = [
  { field: "terrain", col: "terrain", table: "parkTerrain" },
  { field: "amenities", col: "amenity", table: "parkAmenity" },
  { field: "camping", col: "camping", table: "parkCamping" },
  { field: "vehicleTypes", col: "vehicleType", table: "parkVehicleType" },
] as const;

const isEmpty = (v: unknown) => v === null || v === undefined || v === "";

async function main() {
  const mapFile = process.argv[2];
  const commit = process.argv.includes("--commit");
  const prodUrl = process.env.PROD_POSTGRES_URL ?? process.env.PROD_POSTGRES_PRISMA_URL;
  if (!mapFile) { console.error("Usage: enrich-prod.ts <mapping.json> [--commit]"); process.exit(1); }
  if (!prodUrl) { console.error("✋ PROD_POSTGRES_URL not set — refusing to run."); process.exit(1); }
  const prod = new PrismaClient({ datasources: { db: { url: prodUrl } } });
  const mapping: { devName: string; prodName: string }[] = JSON.parse(readFileSync(mapFile, "utf8"));

  console.log(`\n${commit ? "🚀 COMMIT" : "🔎 DRY-RUN"} — enriching ${mapping.length} prod park(s) (add-only)\n`);

  const inc = { address: true, terrain: true, amenities: true, camping: true, vehicleTypes: true } as const;
  for (const { devName, prodName } of mapping) {
    const src = await dev.park.findFirst({ where: { name: devName }, include: inc });
    const tgt = await prod.park.findFirst({ where: { name: prodName }, include: inc });
    if (!src) { console.log(`  ⚠️  dev "${devName}" not found — skipped`); continue; }
    if (!tgt) { console.log(`  ⚠️  prod "${prodName}" not found — skipped`); continue; }

    console.log(`\n▸ ${prodName}  (prod ${Math.round(tgt.dataCompletenessScore ?? 0)}%)  ⇐  dev "${devName}"`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parkData: any = {};
    for (const f of FILL_SCALARS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (isEmpty((tgt as any)[f]) && !isEmpty((src as any)[f])) { parkData[f] = (src as any)[f]; console.log(`    + ${f} = ${JSON.stringify((src as any)[f])}`); }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addrData: any = {};
    for (const f of FILL_ADDRESS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (isEmpty((tgt.address as any)?.[f]) && !isEmpty((src.address as any)?.[f])) { addrData[f] = (src.address as any)[f]; console.log(`    + address.${f} = ${JSON.stringify((src.address as any)[f])}`); }
    }
    const arrayAdds: { def: typeof ARRAY_DEFS[number]; values: string[] }[] = [];
    for (const def of ARRAY_DEFS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const have = new Set((tgt as any)[def.field].map((r: any) => r[def.col]));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const add = (src as any)[def.field].map((r: any) => r[def.col]).filter((v: string) => !have.has(v));
      if (add.length) { arrayAdds.push({ def, values: add }); console.log(`    + ${def.field} += ${JSON.stringify(add)}`); }
    }

    const nChanges = Object.keys(parkData).length + Object.keys(addrData).length + arrayAdds.reduce((a, x) => a + x.values.length, 0);
    if (nChanges === 0) { console.log("    (nothing to fill — prod already covers dev)"); continue; }
    if (!commit) { console.log(`    ⇒ would apply ${nChanges} change(s)`); continue; }

    await prod.$transaction(async (tx) => {
      if (Object.keys(parkData).length) await tx.park.update({ where: { id: tgt.id }, data: parkData });
      if (Object.keys(addrData).length) {
        if (tgt.address) await tx.address.update({ where: { parkId: tgt.id }, data: addrData });
        else await tx.address.create({ data: { parkId: tgt.id, state: src.address?.state ?? "Arkansas", ...addrData } });
      }
      for (const { def, values } of arrayAdds)
        for (const v of values)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (tx as any)[def.table].create({ data: { parkId: tgt.id, [def.col]: v } });

      const fresh = await tx.park.findUnique({ where: { id: tgt.id }, include: inc });
      if (fresh) await tx.park.update({ where: { id: tgt.id }, data: { dataCompletenessScore: calculateCompleteness(fresh as unknown as DbPark) } });
    });
    const after = await prod.park.findUnique({ where: { id: tgt.id }, select: { dataCompletenessScore: true } });
    console.log(`    ✅ applied ${nChanges} change(s) — completeness now ${Math.round(after?.dataCompletenessScore ?? 0)}%`);
  }

  console.log(`\n${commit ? "Enrichment committed." : "Dry-run only — re-run with --commit to write."}\n`);
  await dev.$disconnect();
  await prod.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
