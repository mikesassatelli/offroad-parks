-- AlterTable: nullable source snippet showing where the AI found each value.
-- Nullable with no default, so every existing FieldExtraction row stays valid
-- (older extractions simply have no captured quote).
ALTER TABLE "FieldExtraction" ADD COLUMN "sourceQuote" TEXT;
