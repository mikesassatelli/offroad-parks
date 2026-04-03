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
  if (extraction.status !== "PENDING_REVIEW") {
    return NextResponse.json({ error: "Extraction is not pending review" }, { status: 400 });
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

  await prisma.$transaction(async (tx) => {
    // Apply value to park based on field type
    if (fieldName.startsWith("address.")) {
      const addressField = fieldName.slice("address.".length);
      await tx.address.updateMany({
        where: { parkId },
        data: { [addressField]: parsedValue },
      });
    } else if (fieldName === "terrain") {
      await tx.parkTerrain.deleteMany({ where: { parkId } });
      for (const t of parsedValue as string[]) {
        await tx.parkTerrain.create({ data: { parkId, terrain: t as never } });
      }
    } else if (fieldName === "amenities") {
      await tx.parkAmenity.deleteMany({ where: { parkId } });
      for (const a of parsedValue as string[]) {
        await tx.parkAmenity.create({ data: { parkId, amenity: a as never } });
      }
    } else if (fieldName === "camping") {
      await tx.parkCamping.deleteMany({ where: { parkId } });
      for (const c of parsedValue as string[]) {
        await tx.parkCamping.create({ data: { parkId, camping: c as never } });
      }
    } else if (fieldName === "vehicleTypes") {
      await tx.parkVehicleType.deleteMany({ where: { parkId } });
      for (const v of parsedValue as string[]) {
        await tx.parkVehicleType.create({ data: { parkId, vehicleType: v as never } });
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

    // Supersede older pending extractions for same field
    await tx.fieldExtraction.updateMany({
      where: {
        parkId,
        fieldName,
        status: "PENDING_REVIEW",
        id: { not: id },
      },
      data: { status: "SUPERSEDED" },
    });

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

  return NextResponse.json({ success: true });
}
