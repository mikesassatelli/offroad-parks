// OP-83: Multi-Source Cross-Validation
// Compare field values across multiple sources. Agreement from 2+ reliable
// sources raises confidence. Disagreements flagged as conflicts for OP-84.

import { prisma } from "@/lib/prisma";
import { normalizeUrl } from "@/lib/ai/source-discovery";
import { EXTRACTABLE_FIELDS } from "@/lib/ai/config";
import type { CrossValidationResult } from "@/lib/types";

// Minimum reliability score to count a source as "reliable" for agreement
const RELIABLE_SOURCE_THRESHOLD = 70;

// Minimum Jaccard similarity for array fields to count as agreement
const ARRAY_AGREEMENT_THRESHOLD = 0.5;

// Fields that are arrays
const ARRAY_FIELDS = new Set(
  Object.entries(EXTRACTABLE_FIELDS)
    .filter(([, type]) => type.endsWith("[]"))
    .map(([name]) => name)
);

// Fields that are booleans
const BOOLEAN_FIELDS = new Set(
  Object.entries(EXTRACTABLE_FIELDS)
    .filter(([, type]) => type === "boolean")
    .map(([name]) => name)
);

// Fields that are numbers (prices, counts, etc.)
const NUMBER_FIELDS = new Set(
  Object.entries(EXTRACTABLE_FIELDS)
    .filter(([, type]) => type === "number")
    .map(([name]) => name)
);

// Fields that contain phone numbers
const PHONE_FIELDS = new Set(["phone", "campingPhone"]);

// Fields that contain URLs
const URL_FIELDS = new Set(["website", "campingWebsite"]);

/**
 * Normalize a value for comparison based on the field type.
 * Exported for testing.
 */
export function normalizeValueForComparison(
  fieldName: string,
  value: string
): string {
  if (!value) return "";

  // Phone numbers: compare digits only
  if (PHONE_FIELDS.has(fieldName)) {
    return value.replace(/\D/g, "");
  }

  // URLs: use normalizeUrl from source-discovery
  if (URL_FIELDS.has(fieldName)) {
    return normalizeUrl(value);
  }

  // Numbers: parse and round to 2 decimals
  if (NUMBER_FIELDS.has(fieldName)) {
    const num = parseFloat(value);
    if (isNaN(num)) return value.trim().toLowerCase();
    return num.toFixed(2);
  }

  // Booleans: normalize to lowercase string
  if (BOOLEAN_FIELDS.has(fieldName)) {
    const lower = value.trim().toLowerCase();
    if (lower === "true" || lower === "yes" || lower === "1") return "true";
    if (lower === "false" || lower === "no" || lower === "0") return "false";
    return lower;
  }

  // Arrays: normalize each element, sort, and join
  if (ARRAY_FIELDS.has(fieldName)) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return JSON.stringify(
          parsed.map((v: string) => String(v).trim().toLowerCase()).sort()
        );
      }
    } catch {
      // Not valid JSON — treat as a plain string
    }
    return value.trim().toLowerCase();
  }

  // Default strings: strip whitespace and lowercase
  return value.trim().toLowerCase();
}

/**
 * Compute Jaccard similarity between two arrays.
 * Returns a value between 0 and 1.
 */
function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a.map((v) => v.trim().toLowerCase()));
  const setB = new Set(b.map((v) => v.trim().toLowerCase()));

  if (setA.size === 0 && setB.size === 0) return 1;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * For array fields, check if two values "agree" by Jaccard similarity.
 * Non-array fields use exact match on normalized value.
 */
function valuesAgree(
  fieldName: string,
  normalizedA: string,
  normalizedB: string
): boolean {
  if (!ARRAY_FIELDS.has(fieldName)) {
    return normalizedA === normalizedB;
  }

  // Parse both arrays and compare via Jaccard
  try {
    const arrA: string[] = JSON.parse(normalizedA);
    const arrB: string[] = JSON.parse(normalizedB);
    if (Array.isArray(arrA) && Array.isArray(arrB)) {
      return jaccardSimilarity(arrA, arrB) >= ARRAY_AGREEMENT_THRESHOLD;
    }
  } catch {
    // Fall back to exact match
  }
  return normalizedA === normalizedB;
}

type ExtractionWithSource = {
  id: string;
  extractedValue: string | null;
  confidenceScore: number | null;
  dataSourceId: string | null;
  dataSource: {
    id: string;
    url: string;
    reliability: number;
  } | null;
};

/**
 * Run cross-validation for a single field on a park.
 */
export async function crossValidateField(
  parkId: string,
  fieldName: string
): Promise<CrossValidationResult> {
  const extractions = await prisma.fieldExtraction.findMany({
    where: {
      parkId,
      fieldName,
      status: { in: ["PENDING_REVIEW", "APPROVED"] },
      extractedValue: { not: null },
      dataSourceId: { not: null },
    },
    include: {
      dataSource: {
        select: { id: true, url: true, reliability: true },
      },
    },
  });

  return buildValidationResult(fieldName, extractions);
}

/**
 * Run cross-validation for all pending fields on a park.
 */
export async function crossValidatePark(
  parkId: string
): Promise<CrossValidationResult[]> {
  // Fetch all extractions for this park that are actionable
  const extractions = await prisma.fieldExtraction.findMany({
    where: {
      parkId,
      status: { in: ["PENDING_REVIEW", "APPROVED"] },
      extractedValue: { not: null },
      dataSourceId: { not: null },
    },
    include: {
      dataSource: {
        select: { id: true, url: true, reliability: true },
      },
    },
  });

  // Group by fieldName
  const byField = new Map<string, typeof extractions>();
  for (const ext of extractions) {
    const existing = byField.get(ext.fieldName) ?? [];
    existing.push(ext);
    byField.set(ext.fieldName, existing);
  }

  const results: CrossValidationResult[] = [];

  for (const [fieldName, fieldExtractions] of byField) {
    // Need 2+ extractions from different sources to cross-validate
    const distinctSources = new Set(
      fieldExtractions.map((e) => e.dataSourceId)
    );
    if (distinctSources.size < 2) continue;

    const result = await buildValidationResult(fieldName, fieldExtractions);
    results.push(result);
  }

  return results;
}

/**
 * Build a CrossValidationResult from a set of extractions for a single field,
 * and update CONFLICT statuses in the database when disagreement is detected.
 */
async function buildValidationResult(
  fieldName: string,
  extractions: ExtractionWithSource[]
): Promise<CrossValidationResult> {
  // Filter to extractions that have a valid source
  const validExtractions = extractions.filter(
    (e) => e.extractedValue != null && e.dataSource != null
  );

  // Build the values array for the result
  const values = validExtractions.map((e) => ({
    value: e.extractedValue!,
    sourceId: e.dataSource!.id,
    sourceUrl: e.dataSource!.url,
    sourceReliability: e.dataSource!.reliability,
    confidence: e.confidenceScore,
    extractionId: e.id,
  }));

  // Group by normalized value
  const groups = new Map<
    string,
    Array<(typeof values)[number]>
  >();

  for (const v of values) {
    const normalized = normalizeValueForComparison(fieldName, v.value);
    // For array fields, we need to check agreement with existing groups
    let matched = false;

    if (ARRAY_FIELDS.has(fieldName)) {
      for (const [groupKey, groupValues] of groups) {
        if (valuesAgree(fieldName, normalized, groupKey)) {
          groupValues.push(v);
          matched = true;
          break;
        }
      }
    } else {
      if (groups.has(normalized)) {
        groups.get(normalized)!.push(v);
        matched = true;
      }
    }

    if (!matched) {
      groups.set(normalized, [v]);
    }
  }

  // Find the largest group that has 2+ reliable sources
  let agreedValue: string | null = null;
  let isConflict = false;

  // Sort groups by size (largest first), then by sum of reliability
  const sortedGroups = [...groups.entries()].sort((a, b) => {
    const reliableA = a[1].filter(
      (v) => v.sourceReliability >= RELIABLE_SOURCE_THRESHOLD
    ).length;
    const reliableB = b[1].filter(
      (v) => v.sourceReliability >= RELIABLE_SOURCE_THRESHOLD
    ).length;
    return reliableB - reliableA || b[1].length - a[1].length;
  });

  if (sortedGroups.length > 0) {
    const [, largestGroup] = sortedGroups[0];
    const reliableInLargest = largestGroup.filter(
      (v) => v.sourceReliability >= RELIABLE_SOURCE_THRESHOLD
    );

    if (reliableInLargest.length >= 2) {
      // Agreement: 2+ reliable sources agree on the same value
      agreedValue = largestGroup[0].value;
    } else if (groups.size >= 2) {
      // No clear agreement and 2+ distinct values → conflict
      isConflict = true;
    }
  }

  // If conflict, update extraction statuses in the database
  if (isConflict) {
    const extractionIds = validExtractions.map((e) => e.id);
    if (extractionIds.length > 0) {
      await prisma.fieldExtraction.updateMany({
        where: { id: { in: extractionIds } },
        data: { status: "CONFLICT" },
      });
    }
  }

  return {
    fieldName,
    values,
    agreedValue,
    isConflict,
  };
}
