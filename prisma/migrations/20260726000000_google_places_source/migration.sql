-- Add Google Places as a first-class data source for the AI research pipeline.
-- The Places lookup provides authoritative, structured location data (coords,
-- address, phone, website) rather than LLM-guessed values from scraped pages.
-- A value can't be safely used in the same migration transaction that adds it,
-- so there is no backfill here.
ALTER TYPE "DataSourceType" ADD VALUE IF NOT EXISTS 'googlePlaces' AFTER 'campingDirectory';

-- Stable Google place_id for a park's Google Maps listing. Enables idempotent
-- re-lookups and "open in Google Maps" links. Existing rows stay NULL until the
-- pipeline matches them to a listing.
ALTER TABLE "Park" ADD COLUMN "googlePlaceId" TEXT;
