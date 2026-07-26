-- Replace the single-default UserSearchPreference (one row per user, auto-applied
-- on load) with many named presets per user (SavedSearchFilter), applied
-- manually from the Filters panel. Existing defaults are migrated in as a named
-- preset so nobody loses their saved filters.

-- CreateTable
CREATE TABLE "SavedSearchFilter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedSearchFilter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedSearchFilter_userId_name_key" ON "SavedSearchFilter"("userId", "name");

-- CreateIndex
CREATE INDEX "SavedSearchFilter_userId_idx" ON "SavedSearchFilter"("userId");

-- AddForeignKey
ALTER TABLE "SavedSearchFilter" ADD CONSTRAINT "SavedSearchFilter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate each existing single default into a named preset ("My saved filters")
-- so a user's previously-saved default survives as their first preset.
INSERT INTO "SavedSearchFilter" ("id", "userId", "name", "filters", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "userId", 'My saved filters', "filters", "createdAt", "updatedAt"
FROM "UserSearchPreference";

-- DropTable (superseded by SavedSearchFilter)
DROP TABLE "UserSearchPreference";
