-- Buckhorn OHV Trails: the stored park coordinate (35.633, -94.169) was ~11 km
-- off — it resolved to unrelated trails, which is why Buckhorn was skipped in the
-- earlier trail-geometry import. Correct the park + address location to the main
-- trailhead / entry point on N Lee Creek Rd (USFS/operator-provided; public
-- domain). Name-matched, so this is slug-resilient and a safe no-op if absent.

UPDATE "Park"
SET "latitude" = 35.71379, "longitude" = -94.307411
WHERE "name" ILIKE '%buckhorn%';

UPDATE "Address"
SET "latitude" = 35.71379, "longitude" = -94.307411
WHERE "parkId" IN (SELECT "id" FROM "Park" WHERE "name" ILIKE '%buckhorn%');
