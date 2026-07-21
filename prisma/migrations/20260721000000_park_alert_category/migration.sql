-- CreateEnum
CREATE TYPE "ParkAlertCategory" AS ENUM ('OPERATOR', 'OFFICIAL_CLOSURE');

-- AlterTable: new column defaults to OPERATOR so every existing row is valid.
ALTER TABLE "ParkAlert" ADD COLUMN "category" "ParkAlertCategory" NOT NULL DEFAULT 'OPERATOR';

-- CreateIndex
CREATE INDEX "ParkAlert_parkId_category_isActive_idx" ON "ParkAlert"("parkId", "category", "isActive");

-- Backfill: every alert authored by the Iowa DNR OHV scraper's system user is an
-- official agency closure. That bot user id has always been the scraper's source
-- marker (see src/lib/iowa-ohv/sync.ts), so this is a safe, exact reclassification.
UPDATE "ParkAlert"
SET "category" = 'OFFICIAL_CLOSURE'
WHERE "userId" IN (
    SELECT "id" FROM "User" WHERE "email" = 'iowa-dnr-ohv-bot@system.offroadparks.com'
);
