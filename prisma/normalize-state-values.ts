/**
 * One-time data fix: normalize all `Address.state` and `ParkCandidate.state`
 * values to the canonical US state full name (e.g. "AR" → "Arkansas").
 *
 * Historically the AI discovery pipeline wrote 2-letter postal codes into
 * these columns, which then leaked into the filter dropdown. This script
 * corrects existing rows; the write-side fix in `src/lib/us-states.ts` and
 * the validation wiring prevents new bad data.
 *
 * Usage:
 *   npx tsx prisma/normalize-state-values.ts          # apply the fix
 *   npx tsx prisma/normalize-state-values.ts --dry    # log changes only
 *
 * Targets the DB from .env. Safe to run multiple times — rows that are
 * already canonical are left alone, and unrecognized values are logged and
 * skipped (not overwritten).
 */

import { PrismaClient } from "@prisma/client";
import { normalizeStateName, isCanonicalStateName } from "../src/lib/us-states";

const prisma = new PrismaClient();

interface ChangeRecord {
  table: "Address" | "ParkCandidate";
  id: string;
  contextLabel: string; // park name / candidate name for readable logs
  before: string;
  after: string | null;
}

async function main() {
  const dryRun = process.argv.includes("--dry");
  if (dryRun) {
    console.log("── DRY RUN — no writes will be made ──\n");
  }

  const changes: ChangeRecord[] = [];
  const unresolved: ChangeRecord[] = [];

  // ── Addresses ─────────────────────────────────────────────────────────────
  const addresses = await prisma.address.findMany({
    select: {
      id: true,
      state: true,
      park: { select: { name: true } },
    },
  });

  for (const addr of addresses) {
    if (isCanonicalStateName(addr.state)) continue;
    const canonical = normalizeStateName(addr.state);
    const record: ChangeRecord = {
      table: "Address",
      id: addr.id,
      contextLabel: addr.park?.name ?? "(unknown park)",
      before: addr.state,
      after: canonical,
    };
    if (canonical) changes.push(record);
    else unresolved.push(record);
  }

  // ── Park candidates ───────────────────────────────────────────────────────
  const candidates = await prisma.parkCandidate.findMany({
    select: { id: true, state: true, name: true },
  });

  for (const cand of candidates) {
    if (isCanonicalStateName(cand.state)) continue;
    const canonical = normalizeStateName(cand.state);
    const record: ChangeRecord = {
      table: "ParkCandidate",
      id: cand.id,
      contextLabel: cand.name,
      before: cand.state,
      after: canonical,
    };
    if (canonical) changes.push(record);
    else unresolved.push(record);
  }

  // ── Report ────────────────────────────────────────────────────────────────
  console.log(
    `Scanned ${addresses.length} addresses and ${candidates.length} candidates.`
  );
  console.log(`Rows needing update: ${changes.length}`);
  console.log(`Rows unresolvable:  ${unresolved.length}\n`);

  for (const c of changes) {
    console.log(
      `  ${c.table}#${c.id} [${c.contextLabel}]: "${c.before}" → "${c.after}"`
    );
  }

  if (unresolved.length > 0) {
    console.log("\n── Unresolved rows (left untouched) ──");
    for (const u of unresolved) {
      console.log(
        `  ${u.table}#${u.id} [${u.contextLabel}]: "${u.before}" (no known state matches — please fix manually)`
      );
    }
  }

  if (dryRun || changes.length === 0) {
    console.log("\nNo changes written.");
    return;
  }

  // ── Apply ─────────────────────────────────────────────────────────────────
  // A transaction keeps this all-or-nothing — if any row fails we'd rather
  // stop and investigate than leave the table half-migrated.
  await prisma.$transaction(async (tx) => {
    for (const c of changes) {
      if (!c.after) continue;
      if (c.table === "Address") {
        await tx.address.update({
          where: { id: c.id },
          data: { state: c.after },
        });
      } else {
        await tx.parkCandidate.update({
          where: { id: c.id },
          data: { state: c.after },
        });
      }
    }
  });

  console.log(`\nApplied ${changes.length} updates.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
