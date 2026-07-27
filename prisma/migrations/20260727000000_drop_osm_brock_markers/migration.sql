-- EDW recovery: the USFS Recreation Sites layer is reachable again, so replace
-- Brock Creek's interim OpenStreetMap (ODbL) markers with public-domain USFS
-- coordinates. This migration removes the OSM markers; the next migration
-- inserts the USFS ones. Scoped to source = 'OpenStreetMap' so only the interim
-- markers are removed.

DELETE FROM "ParkMapMarker"
WHERE "source" = 'OpenStreetMap'
  AND "parkId" IN (SELECT "id" FROM "Park" WHERE "name" ILIKE '%brock creek%');
