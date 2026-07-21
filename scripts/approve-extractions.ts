/**
 * Apply verified field extractions to live park data (dev DB — targets .env).
 * Ports the approve transaction from
 * src/app/api/admin/ai-research/extractions/[id]/approve/route.ts (route-only).
 * THIS is the accuracy gate — only run on extractions verified by the review agents.
 *
 * Decisions file (JSON):
 *   { "approve": [{ "id": "<extractionId>", "editedValue": "<json string>"? }, ...],
 *     "reject":  ["<extractionId>", ...] }
 *
 *   npx tsx --env-file=.env --env-file=.env.local scripts/approve-extractions.ts /tmp/ar-decisions.json
 */
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import {
  calculateCompleteness,
  getCurrentFieldValue,
} from "../src/lib/ai/research-lifecycle";
import type { DbPark } from "../src/lib/types";

const ARRAY_FIELDS = ["terrain", "amenities", "camping", "vehicleTypes"];
// Junction-table column name per array field (matches the approve route).
const ARRAY_COL: Record<string, string> = {
  terrain: "terrain",
  amenities: "amenity",
  camping: "camping",
  vehicleTypes: "vehicleType",
};

async function approveOne(id: string, editedValue: string | undefined, adminId: string) {
  const extraction = await prisma.fieldExtraction.findUnique({
    where: { id },
    include: {
      park: {
        include: { terrain: true, amenities: true, camping: true, vehicleTypes: true, address: true },
      },
    },
  });
  if (!extraction) return `SKIP ${id}: not found`;
  if (extraction.status !== "PENDING_REVIEW") return `SKIP ${id}: not pending (${extraction.status})`;

  const valueStr = editedValue ?? extraction.extractedValue;
  if (valueStr === null) return `SKIP ${id}: no value`;
  const parsedValue = JSON.parse(valueStr);
  const fieldName = extraction.fieldName;
  const parkId = extraction.parkId;
  const currentValue = getCurrentFieldValue(extraction.park as unknown as DbPark, fieldName);
  const isArrayField = ARRAY_FIELDS.includes(fieldName);

  await prisma.$transaction(async (tx) => {
    if (fieldName.startsWith("address.")) {
      const addressField = fieldName.slice("address.".length);
      await tx.address.updateMany({ where: { parkId }, data: { [addressField]: parsedValue } });
    } else if (isArrayField) {
      const newValues = parsedValue as string[];
      const table =
        fieldName === "terrain" ? tx.parkTerrain
        : fieldName === "amenities" ? tx.parkAmenity
        : fieldName === "camping" ? tx.parkCamping
        : tx.parkVehicleType;
      const col = ARRAY_COL[fieldName];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existing = await (table as any).findMany({ where: { parkId } });
      const existingSet = new Set(existing.map((e: Record<string, unknown>) => e[col]));
      for (const v of newValues) {
        if (!existingSet.has(v)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (table as any).create({ data: { parkId, [col]: v } });
        }
      }
    } else {
      await tx.park.update({ where: { id: parkId }, data: { [fieldName]: parsedValue } });
    }

    await tx.fieldExtraction.update({
      where: { id },
      data: { status: "APPROVED", verifiedAt: new Date(), verifiedBy: adminId },
    });

    if (isArrayField) {
      const approvedSet = new Set(parsedValue as string[]);
      const otherPending = await tx.fieldExtraction.findMany({
        where: { parkId, fieldName, status: "PENDING_REVIEW", id: { not: id } },
      });
      for (const other of otherPending) {
        if (!other.extractedValue) continue;
        const remaining = (JSON.parse(other.extractedValue) as string[]).filter((v) => !approvedSet.has(v));
        await tx.fieldExtraction.update({
          where: { id: other.id },
          data: remaining.length === 0
            ? { status: "SUPERSEDED" }
            : { extractedValue: JSON.stringify(remaining) },
        });
      }
    } else {
      await tx.fieldExtraction.updateMany({
        where: { parkId, fieldName, status: "PENDING_REVIEW", id: { not: id } },
        data: { status: "SUPERSEDED" },
      });
    }

    await tx.parkEditLog.create({
      data: {
        parkId,
        userId: adminId,
        changes: JSON.stringify({
          [fieldName]: { from: currentValue ? JSON.parse(currentValue) : null, to: parsedValue },
        }),
      },
    });

    const updatedPark = await tx.park.findUnique({
      where: { id: parkId },
      include: { terrain: true, amenities: true, camping: true, vehicleTypes: true, address: true },
    });
    if (updatedPark) {
      await tx.park.update({
        where: { id: parkId },
        data: { dataCompletenessScore: calculateCompleteness(updatedPark as unknown as DbPark) },
      });
    }
  });

  return `✅ ${fieldName} = ${JSON.stringify(parsedValue)}  (park ${parkId})`;
}

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: approve-extractions.ts <decisions.json>");
    process.exit(1);
  }
  const decisions = JSON.parse(readFileSync(path, "utf8")) as {
    approve?: { id: string; editedValue?: string }[];
    reject?: string[];
  };

  const admin = await prisma.user.findFirst({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN"] } },
    select: { id: true, email: true },
  });
  if (!admin) {
    console.error("No ADMIN/SUPER_ADMIN user in the DB to attribute approvals to.");
    process.exit(1);
  }
  console.log(`Attributing to admin: ${admin.email}\n`);

  for (const dec of decisions.approve ?? []) {
    console.log("  " + (await approveOne(dec.id, dec.editedValue, admin.id)));
  }

  for (const id of decisions.reject ?? []) {
    const res = await prisma.fieldExtraction.updateMany({
      where: { id, status: "PENDING_REVIEW" },
      data: { status: "REJECTED", verifiedAt: new Date(), verifiedBy: admin.id },
    });
    console.log(`  ❌ rejected ${id}${res.count ? "" : " (not pending)"}`);
  }

  console.log(
    `\nApplied ${decisions.approve?.length ?? 0} approval(s), ${decisions.reject?.length ?? 0} rejection(s).`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
