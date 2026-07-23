import { prisma } from "@/lib/prisma";
import { EXTRACTABLE_FIELDS } from "./config";
import type { DbPark, ResearchStatus } from "@/lib/types";

/**
 * A research session left IN_PROGRESS longer than this (with no active run) is
 * considered orphaned — the serverless invocation almost certainly died. Used by
 * reconcileStuckResearch() to un-stick parks.
 */
export const STUCK_SESSION_MINUTES = 15;

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
 * Decide a park's resting research status once a research run finishes. Pure so
 * it can be unit tested. `IN_PROGRESS` is only ever a transient (actively-
 * running) state now — a finished run always resolves to a terminal state:
 *  - MAINTENANCE is preserved (an admin opted the park into periodic re-checks)
 *  - graduated → RESEARCHED
 *  - otherwise → PARTIAL (ran, but data is incomplete / awaiting review)
 */
export function resolveTerminalStatus(
  priorStatus: ResearchStatus,
  graduated: boolean
): ResearchStatus {
  if (priorStatus === "MAINTENANCE") return "MAINTENANCE";
  return graduated ? "RESEARCHED" : "PARTIAL";
}

/**
 * Heal parks stuck in IN_PROGRESS. A park is stuck if it's marked IN_PROGRESS
 * but has no research session that is genuinely still running (started within
 * the last STUCK_SESSION_MINUTES) — e.g. a fire-and-forget run whose serverless
 * invocation died before writing a terminal status. Orphaned IN_PROGRESS
 * sessions are marked FAILED and the park is reset to a runnable resting state
 * (PARTIAL if it has been researched before, else NEEDS_RESEARCH).
 *
 * Returns the number of parks reconciled. Cheap when nothing is stuck.
 */
export async function reconcileStuckResearch(): Promise<number> {
  const threshold = new Date(Date.now() - STUCK_SESSION_MINUTES * 60_000);

  const stuck = await prisma.park.findMany({
    where: {
      researchStatus: "IN_PROGRESS",
      NOT: {
        researchSessions: {
          some: { status: "IN_PROGRESS", startedAt: { gte: threshold } },
        },
      },
    },
    select: { id: true, lastResearchedAt: true },
  });

  if (stuck.length === 0) return 0;

  const ids = stuck.map((p) => p.id);
  const researchedBefore = stuck
    .filter((p) => p.lastResearchedAt !== null)
    .map((p) => p.id);
  const neverResearched = stuck
    .filter((p) => p.lastResearchedAt === null)
    .map((p) => p.id);

  await prisma.researchSession.updateMany({
    where: { parkId: { in: ids }, status: "IN_PROGRESS" },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      errorMessage: "Reconciled: session orphaned or exceeded time limit.",
    },
  });

  if (researchedBefore.length > 0) {
    await prisma.park.updateMany({
      where: { id: { in: researchedBefore } },
      data: { researchStatus: "PARTIAL" },
    });
  }
  if (neverResearched.length > 0) {
    await prisma.park.updateMany({
      where: { id: { in: neverResearched } },
      data: { researchStatus: "NEEDS_RESEARCH" },
    });
  }

  return stuck.length;
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
