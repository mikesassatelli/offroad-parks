-- Add a resting "ran but incomplete" state, ordered right after IN_PROGRESS so
-- `ORDER BY researchStatus` keeps a sensible progression. Existing rows are
-- unaffected; parks stuck in IN_PROGRESS are reclassified at runtime by
-- reconcileStuckResearch() (a value can't be safely used in the same migration
-- transaction that adds it, so no backfill here).
ALTER TYPE "ResearchStatus" ADD VALUE IF NOT EXISTS 'PARTIAL' AFTER 'IN_PROGRESS';
