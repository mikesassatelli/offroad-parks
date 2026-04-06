// TODO OP-83: Multi-Source Cross-Validation
// Compare field values across multiple sources. Agreement from 2+ reliable
// sources raises confidence. Disagreements flagged as conflicts for OP-84.

export type CrossValidationResult = {
  fieldName: string;
  agreedValue: string | null;
  agreementCount: number;
  totalSources: number;
  isConflict: boolean;
  conflictingValues?: Array<{
    value: string;
    sourceId: string;
    sourceUrl: string;
    reliability: number;
  }>;
};

/**
 * Compare extracted values for a field across multiple sources.
 * TODO OP-83: Implement agreement scoring and conflict detection.
 * Should feed into source reliability scoring (OP-78).
 */
export async function crossValidateField(
  _parkId: string,
  _fieldName: string,
): Promise<CrossValidationResult> {
  throw new Error("OP-83: Cross-validation not yet implemented");
}

/**
 * Run cross-validation for all pending fields on a park.
 * TODO OP-83: Batch cross-validation after a research session completes.
 */
export async function crossValidatePark(
  _parkId: string,
): Promise<CrossValidationResult[]> {
  throw new Error("OP-83: Cross-validation not yet implemented");
}
