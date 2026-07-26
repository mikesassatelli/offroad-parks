/**
 * Search preferences — shared Zod schema + TypeScript type for the
 * Filters panel state that gets persisted per-user.
 *
 * Persisted fields (mirror `SearchFiltersPanel` props that the panel
 * actually controls — excludes ephemeral state like `searchQuery` and
 * `sortOption` which are not part of the Filters panel).
 */
import { z } from "zod";

// Permit-style tri-state selects use "", "yes", or "no" in the UI.
const triStateSchema = z.enum(["", "yes", "no"]);

export const savedSearchFiltersSchema = z.object({
  selectedState: z.string().optional().nullable(),
  selectedTerrains: z.array(z.string()),
  selectedAmenities: z.array(z.string()),
  selectedCamping: z.array(z.string()),
  selectedVehicleTypes: z.array(z.string()),
  minTrailMiles: z.number().min(0),
  minAcres: z.number().min(0),
  minRating: z.string(),
  selectedOwnership: z.string(),
  permitRequired: triStateSchema,
  membershipRequired: triStateSchema,
  flagsRequired: triStateSchema,
  sparkArrestorRequired: triStateSchema,
});

export type SavedSearchFilters = z.infer<typeof savedSearchFiltersSchema>;

/** Max named filter presets a single user may keep. */
export const MAX_PRESETS = 12;

/** A preset name: trimmed, non-empty, reasonably short. */
export const presetNameSchema = z
  .string()
  .trim()
  .min(1, "Give your preset a name")
  .max(60, "Preset name is too long");

/** POST /api/me/search-presets body. */
export const createPresetBodySchema = z.object({
  name: presetNameSchema,
  filters: savedSearchFiltersSchema,
});

/** PATCH /api/me/search-presets/[id] body — rename and/or replace filters. */
export const updatePresetBodySchema = z
  .object({
    name: presetNameSchema.optional(),
    filters: savedSearchFiltersSchema.optional(),
  })
  .refine((b) => b.name !== undefined || b.filters !== undefined, {
    message: "Nothing to update",
  });

/** Known filter query-string keys. If any of these appear in the URL we
 * respect the explicit URL state and skip auto-applying the saved default. */
export const FILTER_QUERY_KEYS = [
  "state",
  "terrain",
  "amenity",
  "camping",
  "vehicleType",
  "minTrailMiles",
  "minAcres",
  "minRating",
  "ownership",
  "permit",
  "membership",
  "flags",
  "sparkArrestor",
] as const;
