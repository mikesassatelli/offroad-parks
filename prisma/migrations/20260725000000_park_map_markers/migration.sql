-- Named POINT features attached to a park (trailheads, campgrounds/rec areas,
-- staging, gates). Rendered as pins over the trail-geometry overlay.
-- See docs/poc/trail-overlay.md.

-- CreateEnum
CREATE TYPE "MapMarkerType" AS ENUM ('TRAILHEAD', 'CAMPGROUND', 'RECREATION_AREA', 'STAGING', 'PARKING', 'GATE', 'POI');

-- CreateTable
CREATE TABLE "ParkMapMarker" (
    "id" TEXT NOT NULL,
    "parkId" TEXT NOT NULL,
    "type" "MapMarkerType" NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "source" TEXT,
    "sourceRef" TEXT,
    "license" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParkMapMarker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParkMapMarker_parkId_idx" ON "ParkMapMarker"("parkId");

-- AddForeignKey
ALTER TABLE "ParkMapMarker" ADD CONSTRAINT "ParkMapMarker_parkId_fkey" FOREIGN KEY ("parkId") REFERENCES "Park"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed the four Brock Creek access points: 3 trailheads + the lake recreation
-- area. Coordinates are from OpenStreetMap (ODbL) — see the PR for the
-- licensing note. Matched to the park by NAME (not slug) so this is resilient
-- to the prod slug and safely inserts nothing if no "Brock Creek" park exists.
INSERT INTO "ParkMapMarker" ("id", "parkId", "type", "name", "latitude", "longitude", "source", "sourceRef", "license", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id, m.type::"MapMarkerType", m.name, m.lat, m.lng, 'OpenStreetMap', m.ref, 'ODbL', now(), now()
FROM (
    SELECT "id" FROM "Park"
    WHERE "name" ILIKE '%brock creek%'
    ORDER BY ("status" = 'APPROVED') DESC, "createdAt" ASC
    LIMIT 1
) p
CROSS JOIN (VALUES
    ('TRAILHEAD',       'Austin Trailhead',                 35.53621, -92.80373, 'osm:way/1414164901'),
    ('TRAILHEAD',       'Mountain Man Trailhead',           35.52996, -92.83928, 'osm:node/12961235800'),
    ('TRAILHEAD',       'Zing Trailhead',                   35.51044, -92.81777, 'osm:node/10132771817'),
    ('RECREATION_AREA', 'Brock Creek Lake Recreation Area', 35.48960, -92.80935, 'osm:node/12961301703')
) AS m("type", "name", "lat", "lng", "ref");
