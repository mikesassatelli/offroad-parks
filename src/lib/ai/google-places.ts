import { normalizeStateName, type USStateName } from "@/lib/us-states";
import { isFuzzyDuplicate } from "./park-discovery";
import { cleanCounty } from "./extraction-validator";

/**
 * Google Places lookup for authoritative, structured park location data.
 *
 * Unlike the crawl-and-LLM path (source-discovery → content-extractor →
 * park-data-extractor), Places returns structured fields directly — coordinates,
 * address, phone, website — so there is no HTML to fetch and no model guessing.
 * This makes it the most reliable location source in the pipeline, especially
 * for latitude/longitude, which the LLM otherwise has to infer from prose.
 *
 * Uses the current Places API (v1) Text Search. A field mask keeps the request
 * in the "Pro" billing tier and only asks for what we consume.
 *
 * Two guardrails protect against a wrong-park match (the same risk the crawl
 * path handles via wrong-park-guard):
 *   1. the returned place name must fuzzy-match the park name, and
 *   2. the returned place's state must equal the park's state.
 * If either fails, the match is rejected and no data is emitted.
 */

const PLACES_SEARCH_ENDPOINT =
  "https://places.googleapis.com/v1/places:searchText";

/**
 * Reliability score for the googlePlaces DataSource. Set high — Places is
 * authoritative structured data, ranking above scraped web pages (default 50,
 * .gov 85, riderplanet 90).
 */
export const GOOGLE_PLACES_RELIABILITY = 95;

/** Confidence score stamped on Places-sourced FieldExtractions. */
export const GOOGLE_PLACES_CONFIDENCE = 0.98;

/**
 * Field mask — only the fields we actually consume. Keeping this tight both
 * limits response size and holds the request to the cheaper Places SKU.
 */
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.location",
  "places.addressComponents",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.businessStatus",
].join(",");

/** Structured data pulled from a matched Google Places listing. */
export type PlaceData = {
  placeId: string;
  name: string;
  mapsUri: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  website: string | null;
  streetAddress: string | null;
  city: string | null;
  zipCode: string | null;
  county: string | null;
  state: USStateName | null;
  businessStatus: string | null;
};

export type PlaceLookupResult = {
  /**
   * The matched place, or null when the lookup was skipped (no API key), found
   * nothing, failed, or was rejected by a guardrail.
   */
  place: PlaceData | null;
  /** Explanation when `place` is null, for the research session summary. */
  reason: string | null;
  /** True when a billable API request was actually made (for cost accounting). */
  apiCalled: boolean;
};

// ── Google Places API response shapes (only the fields in our mask) ───────────

type PlacesAddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

type PlacesApiPlace = {
  id?: string;
  displayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
  addressComponents?: PlacesAddressComponent[];
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  businessStatus?: string;
};

/**
 * Look up a park's Google Places listing. Returns structured location data when
 * a confident match is found. Degrades gracefully: a missing API key is a silent
 * no-op (matching the SERPAPI_API_KEY pattern in source-discovery), and network
 * or API errors resolve to a null place with a reason rather than throwing.
 */
export async function lookupGooglePlace(
  parkName: string,
  state: string,
  city?: string | null
): Promise<PlaceLookupResult> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return { place: null, reason: null, apiCalled: false };
  }

  const textQuery = [parkName, city, state]
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(", ");

  let data: { places?: PlacesApiPlace[] };
  try {
    const response = await fetch(PLACES_SEARCH_ENDPOINT, {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery,
        regionCode: "US",
        maxResultCount: 1,
      }),
    });

    if (!response.ok) {
      return {
        place: null,
        reason: `Google Places API returned ${response.status}`,
        apiCalled: true,
      };
    }

    data = await response.json();
  } catch (error) {
    return {
      place: null,
      reason: `Google Places request failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      apiCalled: true,
    };
  }

  const raw = data.places?.[0];
  if (!raw) {
    return {
      place: null,
      reason: "No Google Places match found",
      apiCalled: true,
    };
  }

  const parsed = parsePlace(raw);
  if (!parsed) {
    return {
      place: null,
      reason: "Google Places match missing id or coordinates",
      apiCalled: true,
    };
  }

  // ── Guardrail 1: name must fuzzy-match the park we're researching ──────────
  if (!isFuzzyDuplicate(parsed.name, parkName)) {
    return {
      place: null,
      reason: `Google Places returned "${parsed.name}", which does not match "${parkName}" (possible wrong park)`,
      apiCalled: true,
    };
  }

  // ── Guardrail 2: state must match (strongest wrong-park signal) ────────────
  const parkState = normalizeStateName(state);
  if (!parsed.state || parsed.state !== parkState) {
    return {
      place: null,
      reason: `Google Places match is in ${
        parsed.state ?? "an unknown state"
      }, but the park is in ${parkState ?? state} (possible wrong park)`,
      apiCalled: true,
    };
  }

  return { place: parsed, reason: null, apiCalled: true };
}

/** Parse a raw Places API result into PlaceData. Returns null if it lacks the
 *  minimum viable fields (id + coordinates). */
function parsePlace(raw: PlacesApiPlace): PlaceData | null {
  const placeId = raw.id;
  const latitude = raw.location?.latitude;
  const longitude = raw.location?.longitude;

  if (
    !placeId ||
    typeof latitude !== "number" ||
    typeof longitude !== "number"
  ) {
    return null;
  }

  const components = raw.addressComponents ?? [];

  const streetNumber = pickComponent(components, "street_number");
  const route = pickComponent(components, "route");
  const streetAddress =
    [streetNumber, route].filter(Boolean).join(" ") || null;

  const city =
    pickComponent(components, "locality") ??
    pickComponent(components, "postal_town") ??
    pickComponent(components, "sublocality_level_1");

  const zipCode = pickComponent(components, "postal_code");

  const rawCounty = pickComponent(components, "administrative_area_level_2");
  const county = rawCounty ? cleanCounty(rawCounty) : null;

  // Prefer the 2-letter short code for the state, then normalize to the app's
  // canonical full name so it lines up with park.address.state.
  const rawState =
    pickComponent(components, "administrative_area_level_1", "short") ??
    pickComponent(components, "administrative_area_level_1");
  const state = rawState ? normalizeStateName(rawState) : null;

  const mapsUri =
    raw.googleMapsUri ??
    `https://www.google.com/maps/place/?q=place_id:${placeId}`;

  return {
    placeId,
    name: raw.displayName?.text ?? "",
    mapsUri,
    latitude,
    longitude,
    phone: raw.nationalPhoneNumber ?? null,
    website: raw.websiteUri ?? null,
    streetAddress,
    city,
    zipCode,
    county,
    state,
    businessStatus: raw.businessStatus ?? null,
  };
}

/** Find an address component's text by type. Defaults to the long form. */
function pickComponent(
  components: PlacesAddressComponent[],
  type: string,
  prefer: "long" | "short" = "long"
): string | null {
  const match = components.find((c) => c.types?.includes(type));
  if (!match) return null;
  const primary = prefer === "short" ? match.shortText : match.longText;
  return primary ?? match.longText ?? match.shortText ?? null;
}

/**
 * Field names Places can populate, in the pipeline's extractable-field vocabulary
 * (dot notation for address sub-fields). Used to gate the lookup (skip the paid
 * call when none of these fields still need research) and to exclude them from
 * LLM re-extraction once Places has supplied them.
 */
export const PLACE_PROVIDED_FIELDS = [
  "latitude",
  "longitude",
  "phone",
  "website",
  "address.streetAddress",
  "address.city",
  "address.zipCode",
  "address.county",
] as const;

/**
 * Map matched place data to (fieldName, value) pairs in the pipeline's field
 * vocabulary, skipping any field the listing didn't provide. The pipeline turns
 * these into FieldExtraction records for admin review.
 */
export function placeToFieldValues(
  place: PlaceData
): Array<{ fieldName: string; value: string | number }> {
  const pairs: Array<{ fieldName: string; value: string | number | null }> = [
    { fieldName: "latitude", value: place.latitude },
    { fieldName: "longitude", value: place.longitude },
    { fieldName: "phone", value: place.phone },
    { fieldName: "website", value: place.website },
    { fieldName: "address.streetAddress", value: place.streetAddress },
    { fieldName: "address.city", value: place.city },
    { fieldName: "address.zipCode", value: place.zipCode },
    { fieldName: "address.county", value: place.county },
  ];

  return pairs.filter(
    (p): p is { fieldName: string; value: string | number } =>
      p.value !== null && p.value !== ""
  );
}
