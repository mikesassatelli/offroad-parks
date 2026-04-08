import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { calculateCompleteness } from "@/lib/ai/research-lifecycle";
import type { DbPark } from "@/lib/types";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const editedValue = body.editedValue as string | undefined;

  const extraction = await prisma.fieldExtraction.findUnique({
    where: { id },
    include: {
      park: {
        include: {
          terrain: true,
          amenities: true,
          camping: true,
          vehicleTypes: true,
          address: true,
        },
      },
    },
  });

  if (!extraction) {
    return NextResponse.json({ error: "Extraction not found" }, { status: 404 });
  }
  if (extraction.status !== "PENDING_REVIEW" && extraction.status !== "CONFLICT") {
    return NextResponse.json({ error: "Extraction is not pending review or in conflict" }, { status: 400 });
  }

  const valueStr = editedValue ?? extraction.extractedValue;
  if (valueStr === null) {
    return NextResponse.json({ error: "No value to apply" }, { status: 400 });
  }

  const parsedValue = JSON.parse(valueStr);
  const fieldName = extraction.fieldName;
  const parkId = extraction.parkId;

  // Get current value for the edit log
  const { getCurrentFieldValue } = await import("@/lib/ai/research-lifecycle");
  const currentValue = getCurrentFieldValue(extraction.park as unknown as DbPark, fieldName);

  const arrayFields = ["terrain", "amenities", "camping", "vehicleTypes"];
  const isArrayField = arrayFields.includes(fieldName);

  await prisma.$transaction(async (tx) => {
    // Apply value to park based on field type
    if (fieldName.startsWith("address.")) {
      const addressField = fieldName.slice("address.".length);
      await tx.address.updateMany({
        where: { parkId },
        data: { [addressField]: parsedValue },
      });
    } else if (isArrayField) {
      // ADDITIVE: only add new values, never remove existing ones
      const newValues = parsedValue as string[];
      if (fieldName === "terrain") {
        const existing = await tx.parkTerrain.findMany({ where: { parkId } });
        const existingSet = new Set(existing.map((e) => e.terrain));
        for (const t of newValues) {
          if (!existingSet.has(t as never)) {
            await tx.parkTerrain.create({ data: { parkId, terrain: t as never } });
          }
        }
      } else if (fieldName === "amenities") {
        const existing = await tx.parkAmenity.findMany({ where: { parkId } });
        const existingSet = new Set(existing.map((e) => e.amenity));
        for (const a of newValues) {
          if (!existingSet.has(a as never)) {
            await tx.parkAmenity.create({ data: { parkId, amenity: a as never } });
          }
        }
      } else if (fieldName === "camping") {
        const existing = await tx.parkCamping.findMany({ where: { parkId } });
        const existingSet = new Set(existing.map((e) => e.camping));
        for (const c of newValues) {
          if (!existingSet.has(c as never)) {
            await tx.parkCamping.create({ data: { parkId, camping: c as never } });
          }
        }
      } else if (fieldName === "vehicleTypes") {
        const existing = await tx.parkVehicleType.findMany({ where: { parkId } });
        const existingSet = new Set(existing.map((e) => e.vehicleType));
        for (const v of newValues) {
          if (!existingSet.has(v as never)) {
            await tx.parkVehicleType.create({ data: { parkId, vehicleType: v as never } });
          }
        }
      }
    } else {
      // Scalar field
      await tx.park.update({
        where: { id: parkId },
        data: { [fieldName]: parsedValue },
      });
    }

    // Update extraction status
    await tx.fieldExtraction.update({
      where: { id },
      data: {
        status: "APPROVED",
        verifiedAt: new Date(),
        verifiedBy: adminResult.user.id,
      },
    });

    // For scalar fields, supersede all other pending extractions (only one value)
    // For array fields, clean up overlapping values in other pending extractions
    if (isArrayField) {
      const approvedSet = new Set(parsedValue as string[]);
      const otherPending = await tx.fieldExtraction.findMany({
        where: {
          parkId,
          fieldName,
          status: { in: ["PENDING_REVIEW", "CONFLICT"] },
          id: { not: id },
        },
      });
      for (const other of otherPending) {
        if (!other.extractedValue) continue;
        const otherValues = JSON.parse(other.extractedValue) as string[];
        const remaining = otherValues.filter((v) => !approvedSet.has(v));
        if (remaining.length === 0) {
          // All values in this extraction were covered — supersede it
          await tx.fieldExtraction.update({
            where: { id: other.id },
            data: { status: "SUPERSEDED" },
          });
        } else {
          // Update to only show the remaining new values
          await tx.fieldExtraction.update({
            where: { id: other.id },
            data: { extractedValue: JSON.stringify(remaining) },
          });
        }
      }
    } else {
      await tx.fieldExtraction.updateMany({
        where: {
          parkId,
          fieldName,
          status: { in: ["PENDING_REVIEW", "CONFLICT"] },
          id: { not: id },
        },
        data: { status: "SUPERSEDED" },
      });
    }

    // Create audit log
    await tx.parkEditLog.create({
      data: {
        parkId,
        userId: adminResult.user.id,
        changes: JSON.stringify({
          [fieldName]: { from: currentValue ? JSON.parse(currentValue) : null, to: parsedValue },
        }),
      },
    });

    // Update park completeness score
    const updatedPark = await tx.park.findUnique({
      where: { id: parkId },
      include: {
        terrain: true,
        amenities: true,
        camping: true,
        vehicleTypes: true,
        address: true,
      },
    });
    if (updatedPark) {
      const completeness = calculateCompleteness(updatedPark as unknown as DbPark);
      await tx.park.update({
        where: { id: parkId },
        data: { dataCompletenessScore: completeness },
      });
    }
  });

  // OP-79: Record feedback for accuracy tracking
  if (extraction.dataSourceId) {
    const { recordFeedback } = await import("@/lib/ai/feedback-loop");
    recordFeedback(extraction.dataSourceId, "approve").catch(() => {});
  }

  return NextResponse.json({ success: true });
}
