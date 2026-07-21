/**
 * Apply a verified {field: value} map to a single named park, in DEV or PROD.
 * For targeted corrections/enrichment sourced from a research agent (not the
 * PENDING_REVIEW queue). Scalars & address.* OVERWRITE with the provided value
 * (used for verified corrections); array enums are UNIONed (add-only). Invalid
 * enum members are skipped with a warning.
 *
 *  target: "dev" (default POSTGRES_PRISMA_URL) | "prod" (PROD_POSTGRES_URL)
 *  Input JSON: { "fields": { ... } }  or a bare { ... } of field→value.
 *  Dry-run by default; --commit to write.
 *
 *   npx tsx --env-file=.env --env-file=.env.local scripts/apply-field-map.ts dev "Renegade Ranch" /tmp/renegade-fields.json
 *   npx tsx --env-file=.env --env-file=.env.local scripts/apply-field-map.ts prod "Renegade Ranch" /tmp/renegade-fields.json --commit
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { prisma as dev } from "../src/lib/prisma";
import { calculateCompleteness } from "../src/lib/ai/research-lifecycle";
import type { DbPark } from "../src/lib/types";

const ENUMS: Record<string, { col: string; table: string; values: Set<string> }> = {
  terrain: { col: "terrain", table: "parkTerrain", values: new Set(["sand","rocks","mud","trails","hills","motocrossTrack"]) },
  amenities: { col: "amenity", table: "parkAmenity", values: new Set(["restrooms","showers","food","fuel","repair","boatRamp","loadingRamp","picnicTable","shelter","grill","playground","wifi","fishing","airStation","trailMaps","rentals","training","firstAid","store"]) },
  camping: { col: "camping", table: "parkCamping", values: new Set(["tent","rv30A","rv50A","fullHookup","cabin","groupSite","backcountry"]) },
  vehicleTypes: { col: "vehicleType", table: "parkVehicleType", values: new Set(["motorcycle","atv","sxs","fullSize"]) },
};

async function main() {
  const target = process.argv[2];
  const parkName = process.argv[3];
  const file = process.argv[4];
  const commit = process.argv.includes("--commit");
  if (!["dev","prod"].includes(target) || !parkName || !file) {
    console.error('Usage: apply-field-map.ts <dev|prod> "<park name>" <fields.json> [--commit]');
    process.exit(1);
  }
  let db = dev;
  if (target === "prod") {
    const url = process.env.PROD_POSTGRES_URL ?? process.env.PROD_POSTGRES_PRISMA_URL;
    if (!url) { console.error("✋ PROD_POSTGRES_URL not set — refusing."); process.exit(1); }
    db = new PrismaClient({ datasources: { db: { url } } });
  }
  const raw = JSON.parse(readFileSync(file, "utf8"));
  const fields: Record<string, unknown> = raw.fields ?? raw;

  const inc = { address: true, terrain: true, amenities: true, camping: true, vehicleTypes: true } as const;
  const park = await db.park.findFirst({ where: { name: { equals: parkName, mode: "insensitive" } }, include: inc });
  if (!park) { console.error(`Park "${parkName}" not found in ${target}.`); process.exit(1); }

  console.log(`\n${commit ? "🚀 COMMIT" : "🔎 DRY-RUN"} — apply ${Object.keys(fields).length} field(s) to ${target} "${park.name}" (${Math.round(park.dataCompletenessScore ?? 0)}%)\n`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parkData: any = {}; const addrData: any = {}; const arrayOps: { key: string; add: string[] }[] = [];
  for (const [k, v] of Object.entries(fields)) {
    if (k in ENUMS) {
      const def = ENUMS[k];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const have = new Set((park as any)[k].map((r: any) => r[def.col]));
      const vals = (v as string[]).filter((x) => { if (!def.values.has(x)) { console.log(`    ! skip invalid ${k} member "${x}"`); return false; } return true; });
      const add = vals.filter((x) => !have.has(x));
      if (add.length) { arrayOps.push({ key: k, add }); console.log(`  + ${k} += ${JSON.stringify(add)}`); }
    } else if (k.startsWith("address.")) {
      const f = k.slice("address.".length); addrData[f] = v; console.log(`  ~ address.${f} = ${JSON.stringify(v)}`);
    } else if (k === "latitude" || k === "longitude") {
      parkData[k] = v; addrData[k] = v; console.log(`  ~ ${k} = ${JSON.stringify(v)}`);
    } else {
      parkData[k] = v; console.log(`  ~ ${k} = ${JSON.stringify(v)}`);
    }
  }

  if (!commit) { console.log(`\n(dry-run) re-run with --commit to write.\n`); await db.$disconnect(); return; }

  await db.$transaction(async (tx) => {
    if (Object.keys(parkData).length) await tx.park.update({ where: { id: park.id }, data: parkData });
    if (Object.keys(addrData).length) {
      if (park.address) await tx.address.update({ where: { parkId: park.id }, data: addrData });
      else await tx.address.create({ data: { parkId: park.id, state: "Arkansas", ...addrData } });
    }
    for (const { key, add } of arrayOps) {
      const def = ENUMS[key];
      for (const val of add)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (tx as any)[def.table].create({ data: { parkId: park.id, [def.col]: val } });
    }
    const fresh = await tx.park.findUnique({ where: { id: park.id }, include: inc });
    if (fresh) await tx.park.update({ where: { id: park.id }, data: { dataCompletenessScore: calculateCompleteness(fresh as unknown as DbPark) } });
  });
  const after = await db.park.findUnique({ where: { id: park.id }, select: { dataCompletenessScore: true } });
  console.log(`\n✅ applied to ${target} "${park.name}" — completeness now ${Math.round(after?.dataCompletenessScore ?? 0)}%\n`);
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
