import { prisma } from "@/lib/prisma";
import { EXTRACTABLE_FIELDS } from "./config";
import type { DbPark } from "@/lib/types";

/**
 * Get field names to exclude from extraction prompts.
 * A field is excluded if it has an APPROVED extraction or a NOT_FOUND status.
 */
export async function getExcludedFields(parkId: string): Promise<string[]> {
  const resolved = await prisma.fieldExtraction.findMany({
    where: {
      parkId,
      OR: [
        { status: "APPROVED" },
        { confidence: "NOT_FOUND" },
      ],
    },
    select: { fieldName: true },
    distinct: ["fieldName"],
  });

  return resolved.map((r) => r.fieldName);
}

/**
 * Calculate data completeness score (0-100) for a park.
 * Counts how many extractable fields have non-null values.
 */
export function calculateCompleteness(park: DbPark): number {
  const fields = Object.keys(EXTRACTABLE_FIELDS);
  let populated = 0;

  for (const field of fields) {
    if (isFieldPopulated(park, field)) {
      populated++;
    }
  }

  return Math.round((populated / fields.length) * 100);
}

/**
 * Determine if a park should graduate to RESEARCHED status.
 */
export function shouldGraduate(
  park: DbPark,
  approvedFieldCount: number,
  sourcesCount: number
): boolean {
  const completeness = calculateCompleteness(park);
  const hasCoords = park.latitude != null && park.longitude != null;
  const hasTerrain = park.terrain.length > 0;
  const hasVehicleTypes = park.vehicleTypes.length > 0;

  return (
    completeness >= 70 &&
    sourcesCount >= 3 &&
    hasCoords &&
    hasTerrain &&
    hasVehicleTypes
  );
}

/**
 * Get the current value of a park field as a JSON-encoded string.
 * Used in the review UI to show "current value vs. extracted value".
 */
export function getCurrentFieldValue(
  park: DbPark,
  fieldName: string
): string | null {
  const value = getFieldRawValue(park, fieldName);
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}

function getFieldRawValue(park: DbPark, fieldName: string): unknown {
  // Address fields use dot notation
  if (fieldName.startsWith("address.")) {
    const addressField = fieldName.slice("address.".length);
    if (!park.address) return null;
    return (park.address as Record<string, unknown>)[addressField] ?? null;
  }

  // Array fields (junction tables)
  switch (fieldName) {
    case "terrain":
      return park.terrain.length > 0
        ? park.terrain.map((t) => t.terrain)
        : null;
    case "amenities":
      return park.amenities.length > 0
        ? park.amenities.map((a) => a.amenity)
        : null;
    case "camping":
      return park.camping.length > 0
        ? park.camping.map((c) => c.camping)
        : null;
    case "vehicleTypes":
      return park.vehicleTypes.length > 0
        ? park.vehicleTypes.map((v) => v.vehicleType)
        : null;
    default:
      break;
  }

  // Scalar fields
  return (park as Record<string, unknown>)[fieldName] ?? null;
}

function isFieldPopulated(park: DbPark, fieldName: string): boolean {
  const value = getFieldRawValue(park, fieldName);
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}
