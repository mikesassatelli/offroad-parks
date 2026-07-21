/**
 * Backfill auto-generated map-hero thumbnails for every park missing one.
 * Mirrors src/lib/map-hero/generate.ts but targets DEV or PROD explicitly
 * (the app's generateMapHero() is bound to the default client, so this is a
 * standalone port that takes a target). Sequential to respect Mapbox limits.
 *
 * Needs NEXT_PUBLIC_MAPBOX_TOKEN + BLOB_READ_WRITE_TOKEN in env.
 *
 *   npx tsx --env-file=.env --env-file=.env.local scripts/backfill-map-heroes.ts dev
 *   npx tsx --env-file=.env --env-file=.env.local scripts/backfill-map-heroes.ts prod
 */
import { PrismaClient } from "@prisma/client";
import { put } from "@vercel/blob";

const STYLE = "outdoors-v12", ZOOM = 10, W = 600, H = 300;

async function main() {
  const target = process.argv[2];
  if (!["dev", "prod"].includes(target)) { console.error("Usage: backfill-map-heroes.ts <dev|prod>"); process.exit(1); }
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) { console.error("✋ NEXT_PUBLIC_MAPBOX_TOKEN not set."); process.exit(1); }
  if (!process.env.BLOB_READ_WRITE_TOKEN) { console.error("✋ BLOB_READ_WRITE_TOKEN not set."); process.exit(1); }

  let url = process.env.POSTGRES_PRISMA_URL;
  if (target === "prod") {
    url = process.env.PROD_POSTGRES_URL ?? process.env.PROD_POSTGRES_PRISMA_URL;
    if (!url) { console.error("✋ PROD_POSTGRES_URL not set."); process.exit(1); }
  }
  const db = new PrismaClient({ datasources: { db: { url: url! } } });

  const parks = await db.park.findMany({
    where: { mapHeroUrl: null, OR: [{ latitude: { not: null } }, { address: { latitude: { not: null } } }] },
    select: { id: true, name: true, latitude: true, longitude: true, address: { select: { latitude: true, longitude: true } } },
  });
  const noCoords = await db.park.count({ where: { mapHeroUrl: null, latitude: null, address: { is: { latitude: null } } } });

  console.log(`\n[${target}] ${parks.length} park(s) missing a hero with coords; ${noCoords} more have no coords (skipped).\n`);
  let ok = 0; const fails: string[] = [];
  for (const p of parks) {
    const lat = p.latitude ?? p.address?.latitude ?? null;
    const lng = p.longitude ?? p.address?.longitude ?? null;
    if (lat == null || lng == null) { fails.push(`${p.name}: no coords`); continue; }
    try {
      const res = await fetch(`https://api.mapbox.com/styles/v1/mapbox/${STYLE}/static/${lng},${lat},${ZOOM}/${W}x${H}@2x?access_token=${token}`);
      if (!res.ok) { fails.push(`${p.name}: mapbox ${res.status}`); continue; }
      const buffer = Buffer.from(await res.arrayBuffer());
      const blob = await put(`parks/${p.id}/map-hero.jpg`, buffer, { access: "public", contentType: "image/jpeg", allowOverwrite: true });
      await db.park.update({ where: { id: p.id }, data: { mapHeroUrl: blob.url, mapHeroGeneratedAt: new Date() } });
      console.log(`  ✅ ${p.name}`);
      ok++;
    } catch (e) { fails.push(`${p.name}: ${(e as Error).message?.slice(0, 80)}`); }
  }
  console.log(`\n[${target}] generated ${ok}, failed ${fails.length}${fails.length ? ":\n  - " + fails.join("\n  - ") : ""}\n`);
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
