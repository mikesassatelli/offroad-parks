-- Bulk-research queue: parks with a non-null researchQueuedAt are waiting to be
-- researched by the /api/cron/research-queue drain. Nullable, so existing rows
-- are simply "not queued".
ALTER TABLE "Park" ADD COLUMN "researchQueuedAt" TIMESTAMP(3);

-- Drain order / "is anything queued?" checks read this column.
CREATE INDEX "Park_researchQueuedAt_idx" ON "Park"("researchQueuedAt");
