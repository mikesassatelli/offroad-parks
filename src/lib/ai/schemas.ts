import { z } from "zod";

/** Schema for a single extracted field with confidence metadata. */
function field<T extends z.ZodTypeAny>(valueSchema: T) {
  return z
    .object({
      value: valueSchema,
      confidence: z.number().min(0).max(1),
      source_quote: z.string().optional(),
    })
    .optional();
}

/**
 * Full extraction schema for park data. Each field is optional because the AI
 * may not find every data point in a given source. The enum values match
 * the Prisma schema exactly.
 */
export const parkExtractionSchema = z.object({
  // Location
  latitude: field(z.number().min(-90).max(90)),
  longitude: field(z.number().min(-180).max(180)),

  // Contact
  website: field(z.string()),
  phone: field(z.string()),
  contactEmail: field(z.string()),
  campingWebsite: field(z.string()),
  campingPhone: field(z.string()),

  // Pricing
  isFree: field(z.boolean()),
  dayPassUSD: field(z.number().min(0)),
  vehicleEntryFeeUSD: field(z.number().min(0)),
  riderFeeUSD: field(z.number().min(0)),
  membershipFeeUSD: field(z.number().min(0)),

  // Physical
  milesOfTrails: field(z.number().int().min(0)),
  acres: field(z.number().int().min(0)),
  notes: field(z.string()),

  // Operational
  datesOpen: field(z.string()),
  ownership: field(
    z.enum(["private", "public", "mixed", "unknown"])
  ),
  permitRequired: field(z.boolean()),
  permitType: field(z.string()),
  membershipRequired: field(z.boolean()),
  maxVehicleWidthInches: field(z.number().int().min(0)),
  flagsRequired: field(z.boolean()),
  sparkArrestorRequired: field(z.boolean()),
  noiseLimitDBA: field(z.number().int().min(0)),

  // Address
  streetAddress: field(z.string()),
  city: field(z.string()),
  zipCode: field(z.string()),
  county: field(z.string()),

  // Categorical (arrays)
  terrain: field(
    z.array(
      z.enum(["sand", "rocks", "mud", "trails", "hills", "motocrossTrack"])
    )
  ),
  amenities: field(
    z.array(
      z.enum([
        "restrooms",
        "showers",
        "food",
        "fuel",
        "repair",
        "boatRamp",
        "loadingRamp",
        "picnicTable",
        "shelter",
        "grill",
        "playground",
        "wifi",
        "fishing",
        "airStation",
        "trailMaps",
        "rentals",
        "training",
        "firstAid",
        "store",
      ])
    )
  ),
  camping: field(
    z.array(
      z.enum([
        "tent",
        "rv30A",
        "rv50A",
        "fullHookup",
        "cabin",
        "groupSite",
        "backcountry",
      ])
    )
  ),
  vehicleTypes: field(
    z.array(z.enum(["motorcycle", "atv", "sxs", "fullSize"]))
  ),
});

export type ParkExtraction = z.infer<typeof parkExtractionSchema>;

/**
 * Build a filtered schema excluding fields that are already resolved
 * (APPROVED or NOT_FOUND). Returns a new Zod schema with only the
 * fields still worth extracting.
 */
export function buildFilteredSchema(excludeFields: string[]) {
  const exclude = new Set(excludeFields);
  const shape = parkExtractionSchema.shape;
  const filtered: Record<string, z.ZodTypeAny> = {};

  for (const [key, schema] of Object.entries(shape)) {
    // Map address fields: in extraction schema they're flat (city),
    // but in excludeFields they use dot notation (address.city)
    const addressFields = ["streetAddress", "city", "zipCode", "county"];
    const fieldKey = addressFields.includes(key) ? `address.${key}` : key;

    if (!exclude.has(fieldKey)) {
      filtered[key] = schema;
    }
  }

  return z.object(filtered);
}
