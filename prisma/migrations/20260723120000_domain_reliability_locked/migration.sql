-- Lets an admin pin a domain's reliability score so the nightly feedback-driven
-- auto-tuner leaves it alone. Existing rows default to unlocked.
ALTER TABLE "DomainReliability" ADD COLUMN "locked" BOOLEAN NOT NULL DEFAULT false;
