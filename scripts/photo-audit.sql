-- ============================================================
-- Photo Audit Queries
-- Run against your Neon DB to identify duplicate/mis-assigned photos
-- ============================================================

-- 1. Find duplicate URLs (same Blob URL saved under multiple park records)
SELECT
  url,
  COUNT(*) AS cnt,
  array_agg(DISTINCT "parkId") AS park_ids,
  array_agg(id ORDER BY "createdAt") AS photo_ids
FROM "ParkPhoto"
GROUP BY url
HAVING COUNT(*) > 1
ORDER BY cnt DESC;

-- 2. Find mis-assigned photos (parkId in DB ≠ parkId embedded in the Blob URL path)
-- Blob URL format: https://...blob.vercel-storage.com/parks/{parkId}/{timestamp}-{filename}
SELECT
  id,
  "parkId"                                        AS db_park_id,
  substring(url FROM '/parks/([^/]+)/')            AS url_park_id,
  url,
  status,
  "createdAt"
FROM "ParkPhoto"
WHERE
  substring(url FROM '/parks/([^/]+)/') IS NOT NULL
  AND "parkId" != substring(url FROM '/parks/([^/]+)/');

-- 3. Parks with zero approved photos (candidates for photo outreach)
SELECT
  p.id,
  p.name,
  p.state,
  COUNT(ph.id) AS total_photos,
  COUNT(ph.id) FILTER (WHERE ph.status = 'APPROVED') AS approved_photos
FROM "Park" p
LEFT JOIN "ParkPhoto" ph ON ph."parkId" = p.id
GROUP BY p.id, p.name, p.state
HAVING COUNT(ph.id) FILTER (WHERE ph.status = 'APPROVED') = 0
ORDER BY p.state, p.name;

-- ============================================================
-- Fix: Add unique constraint on ParkPhoto.url
-- Run AFTER cleaning up duplicates above (constraint will fail if dupes exist)
-- ============================================================

-- Step 1: Delete mis-assigned duplicates (keeps the record whose parkId matches URL)
-- REVIEW before running — this deletes rows!
DELETE FROM "ParkPhoto"
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      "parkId",
      substring(url FROM '/parks/([^/]+)/') AS url_park_id,
      url
    FROM "ParkPhoto"
    WHERE substring(url FROM '/parks/([^/]+)/') IS NOT NULL
      AND "parkId" != substring(url FROM '/parks/([^/]+)/')
  ) mis_assigned
);

-- Step 2: For any remaining URL duplicates, keep only the oldest record
DELETE FROM "ParkPhoto"
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (PARTITION BY url ORDER BY "createdAt" ASC) AS rn
    FROM "ParkPhoto"
  ) ranked
  WHERE rn > 1
);

-- Step 3: Apply the unique constraint (schema.prisma already has @@unique([url]))
-- Run via: npx prisma db push  OR  npx prisma migrate dev
-- The equivalent DDL is:
CREATE UNIQUE INDEX IF NOT EXISTS "ParkPhoto_url_key" ON "ParkPhoto"(url);
