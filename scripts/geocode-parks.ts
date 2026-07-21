/**
 * Geocode parks that lack coordinates (so map heroes + map pins work), DEV or
 * PROD. Uses Mapbox geocoding on "streetAddress, city, state" (falls back to
 * "city, state"). Sets park.latitude/longitude AND address.latitude/longitude.
 * Only touches parks with NO existing coords — never overwrites.
 *
 * Needs NEXT_PUBLIC_MAPBOX_TOKEN. Dry-run by default; --commit to write.
 *
 *   npx tsx --env-file=.env --env-file=.env.local scripts/geocode-parks.ts prod
 *   npx tsx --env-file=.env --env-file=.env.local scripts/geocode-parks.ts prod --commit
 */
import { PrismaClient } from "@prisma/client";

async function main() {
  const target = process.argv[2];
  const commit = process.argv.includes("--commit");
  if (!["dev", "prod"].includes(target)) { console.error("Usage: geocode-parks.ts <dev|prod> [--commit]"); process.exit(1); }
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) { console.error("✋ NEXT_PUBLIC_MAPBOX_TOKEN not set."); process.exit(1); }

  let url = process.env.POSTGRES_PRISMA_URL;
  if (target === "prod") {
    url = process.env.PROD_POSTGRES_URL ?? process.env.PROD_POSTGRES_PRISMA_URL;
    if (!url) { console.error("✋ PROD_POSTGRES_URL not set."); process.exit(1); }
  }
  const db = new PrismaClient({ datasources: { db: { url: url! } } });

  const parks = await db.park.findMany({
    where: { latitude: null, address: { is: { latitude: null, city: { not: null } } } },
    select: { id: true, name: true, address: { select: { streetAddress: true, city: true, state: true } } },
    orderBy: { name: "asc" },
  });
  console.log(`\n[${target}] ${commit ? "COMMIT" : "DRY-RUN"} — ${parks.length} park(s) to geocode\n`);

  let done = 0; const fails: string[] = [];
  for (const p of parks) {
    const a = p.address!;
    const q = [a.streetAddress, a.city, a.state].filter(Boolean).join(", ");
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?limit=1&country=us&access_token=${token}`);
      if (!res.ok) { fails.push(`${p.name}: geocode ${res.status}`); continue; }
      const data = await res.json();
      const center = data?.features?.[0]?.center;
      if (!Array.isArray(center) || center.length !== 2) { fails.push(`${p.name}: no result for "${q}"`); continue; }
      const [lng, lat] = center as [number, number];
      const place = data.features[0].place_name ?? "";
      console.log(`  ${commit ? "✅" : "•"} ${p.name}  →  ${lat.toFixed(4)}, ${lng.toFixed(4)}  (${place.slice(0, 60)})`);
      if (commit) {
        await db.park.update({ where: { id: p.id }, data: { latitude: lat, longitude: lng } });
        await db.address.update({ where: { parkId: p.id }, data: { latitude: lat, longitude: lng } });
      }
      done++;
    } catch (e) { fails.push(`${p.name}: ${(e as Error).message?.slice(0, 80)}`); }
  }
  console.log(`\n[${target}] ${commit ? "geocoded" : "would geocode"} ${done}, failed ${fails.length}${fails.length ? ":\n  - " + fails.join("\n  - ") : ""}`);
  if (!commit) console.log("Re-run with --commit to write.\n");
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
