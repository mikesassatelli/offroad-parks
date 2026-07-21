/**
 * Shared park filter/sort semantics.
 *
 * This module is the single source of truth for how the home page's search +
 * filters map onto a query. It is consumed in two places that must never
 * drift apart:
 *
 *   - The client (`OffroadParksApp`) serialises its current Filters-panel
 *     state into a query string via {@link buildParkQueryString} and sends it
 *     to the list + markers endpoints.
 *   - The server (`/api/parks`, `/api/parks/markers`, and `page.tsx` via
 *     `src/lib/park-query.ts`) parses that query string with
 *     {@link parseParkFilterParams} and turns it into a Prisma `where` /
 *     `orderBy` via {@link buildParkWhere} / {@link buildParkOrderBy}.
 *
 * The predicates here mirror the client-side semantics that historically
 * lived in `useFilteredParks` (which is retained for filter STATE + tests).
 */
import type { Prisma } from "@prisma/client";
import type { SortOption } from "@/hooks/useFilteredParks";

/** Tri-state select value used by the permit-style filters. */
export type TriState = "" | "yes" | "no";

/** Number of parks returned per list page. */
export const PARK_PAGE_SIZE = 24;

/** Fully-parsed, normalised filter parameters. */
export interface ParkFilterParams {
  q: string;
  state?: string;
  terrains: string[];
  amenities: string[];
  camping: string[];
  vehicleTypes: string[];
  minTrailMiles: number;
  minAcres: number;
  minRating: string;
  ownership: string;
  permitRequired: TriState;
  membershipRequired: TriState;
  flagsRequired: TriState;
  sparkArrestorRequired: TriState;
  sort: SortOption;
  /** Present only when the user has shared their browser geolocation and the
   *  distance sort is active. Used for server-side distance ordering. */
  userLat?: number;
  userLng?: number;
}

const VALID_SORTS: readonly SortOption[] = [
  "name",
  "price",
  "miles",
  "acres",
  "rating",
  "difficulty-high",
  "difficulty-low",
  "most-reviewed",
  "distance-nearest",
];

function normaliseTriState(value: string | null): TriState {
  return value === "yes" || value === "no" ? value : "";
}

/** Read a possibly-repeated OR comma-separated multi-select param. */
function readMulti(params: URLSearchParams, key: string): string[] {
  const all = params.getAll(key);
  const raw = all.length > 0 ? all : [];
  return raw
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
}

function readNumber(value: string | null, fallback: number): number {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Parse a URLSearchParams (from a request URL) into normalised filter params.
 * Unknown / malformed values fall back to the "no filter" default so the
 * endpoint can never throw on user-supplied query strings.
 */
export function parseParkFilterParams(
  params: URLSearchParams,
): ParkFilterParams {
  const sortRaw = params.get("sort");
  const sort = (VALID_SORTS as string[]).includes(sortRaw ?? "")
    ? (sortRaw as SortOption)
    : "name";

  const latRaw = params.get("lat");
  const lngRaw = params.get("lng");
  const userLat = latRaw != null && latRaw !== "" ? Number(latRaw) : undefined;
  const userLng = lngRaw != null && lngRaw !== "" ? Number(lngRaw) : undefined;

  return {
    q: (params.get("q") ?? "").trim(),
    state: params.get("state") || undefined,
    terrains: readMulti(params, "terrain"),
    amenities: readMulti(params, "amenity"),
    camping: readMulti(params, "camping"),
    vehicleTypes: readMulti(params, "vehicleType"),
    minTrailMiles: readNumber(params.get("minTrailMiles"), 0),
    minAcres: readNumber(params.get("minAcres"), 0),
    minRating: params.get("minRating") ?? "",
    ownership: params.get("ownership") ?? "",
    permitRequired: normaliseTriState(params.get("permit")),
    membershipRequired: normaliseTriState(params.get("membership")),
    flagsRequired: normaliseTriState(params.get("flags")),
    sparkArrestorRequired: normaliseTriState(params.get("sparkArrestor")),
    sort,
    userLat: Number.isFinite(userLat) ? userLat : undefined,
    userLng: Number.isFinite(userLng) ? userLng : undefined,
  };
}

/** Client-side Filters-panel state shape used to build a request query. */
export interface ParkQueryInput {
  searchQuery?: string;
  selectedState?: string;
  selectedTerrains?: string[];
  selectedAmenities?: string[];
  selectedCamping?: string[];
  selectedVehicleTypes?: string[];
  minTrailMiles?: number;
  minAcres?: number;
  minRating?: string;
  selectedOwnership?: string;
  permitRequired?: string;
  membershipRequired?: string;
  flagsRequired?: string;
  sparkArrestorRequired?: string;
  sortOption?: SortOption;
  userCoords?: { lat: number; lng: number } | null;
}

/**
 * Serialise the current client Filters-panel state into a URLSearchParams.
 * Only non-default values are emitted so the query string stays compact and
 * identical requests share a cache key. `page` is appended separately by the
 * caller so this can be reused verbatim for the markers endpoint.
 */
export function buildParkQueryString(input: ParkQueryInput): URLSearchParams {
  const params = new URLSearchParams();

  const q = input.searchQuery?.trim();
  if (q) params.set("q", q);
  if (input.selectedState) params.set("state", input.selectedState);
  for (const t of input.selectedTerrains ?? []) params.append("terrain", t);
  for (const a of input.selectedAmenities ?? []) params.append("amenity", a);
  for (const c of input.selectedCamping ?? []) params.append("camping", c);
  for (const v of input.selectedVehicleTypes ?? [])
    params.append("vehicleType", v);
  if (input.minTrailMiles && input.minTrailMiles > 0)
    params.set("minTrailMiles", String(input.minTrailMiles));
  if (input.minAcres && input.minAcres > 0)
    params.set("minAcres", String(input.minAcres));
  if (input.minRating) params.set("minRating", input.minRating);
  if (input.selectedOwnership) params.set("ownership", input.selectedOwnership);
  if (input.permitRequired) params.set("permit", input.permitRequired);
  if (input.membershipRequired)
    params.set("membership", input.membershipRequired);
  if (input.flagsRequired) params.set("flags", input.flagsRequired);
  if (input.sparkArrestorRequired)
    params.set("sparkArrestor", input.sparkArrestorRequired);

  const sort = input.sortOption ?? "name";
  if (sort !== "name") params.set("sort", sort);

  // Only forward coordinates when they're actually needed for distance sort —
  // avoids leaking the user's location into unrelated requests/caches.
  if (sort === "distance-nearest" && input.userCoords) {
    params.set("lat", String(input.userCoords.lat));
    params.set("lng", String(input.userCoords.lng));
  }

  return params;
}

/** True when the requested sort must be computed in JS (needs user coords). */
export function isDistanceSort(sort: SortOption): boolean {
  return sort === "distance-nearest";
}

/** For a nullable boolean tri-state "no", match both `false` and `null`
 *  (mirrors the client `value !== true` predicate, which SQL `!= true` does
 *  NOT do because it excludes NULLs). */
function triStateWhere(
  field: "permitRequired" | "membershipRequired" | "flagsRequired" | "sparkArrestorRequired",
  value: TriState,
): Prisma.ParkWhereInput[] {
  if (value === "yes") return [{ [field]: true }];
  if (value === "no") return [{ OR: [{ [field]: false }, { [field]: null }] }];
  return [];
}

/**
 * Build the Prisma `where` for a set of filter params. Always constrains to
 * APPROVED parks. Mirrors `useFilteredParks` semantics field-for-field.
 */
export function buildParkWhere(
  params: ParkFilterParams,
): Prisma.ParkWhereInput {
  const and: Prisma.ParkWhereInput[] = [{ status: "APPROVED" }];

  if (params.q) {
    const contains = { contains: params.q, mode: "insensitive" as const };
    and.push({
      OR: [
        { name: contains },
        { notes: contains },
        { address: { city: contains } },
        { address: { state: contains } },
      ],
    });
  }

  if (params.state) {
    and.push({ address: { state: params.state } });
  }

  if (params.terrains.length > 0) {
    and.push({
      terrain: { some: { terrain: { in: params.terrains as never } } },
    });
  }
  if (params.amenities.length > 0) {
    and.push({
      amenities: { some: { amenity: { in: params.amenities as never } } },
    });
  }
  if (params.camping.length > 0) {
    and.push({
      camping: { some: { camping: { in: params.camping as never } } },
    });
  }
  if (params.vehicleTypes.length > 0) {
    and.push({
      vehicleTypes: {
        some: { vehicleType: { in: params.vehicleTypes as never } },
      },
    });
  }

  if (params.minTrailMiles > 0) {
    and.push({ milesOfTrails: { gte: params.minTrailMiles } });
  }
  if (params.minAcres > 0) {
    and.push({ acres: { gte: params.minAcres } });
  }
  if (params.minRating) {
    const value = parseFloat(params.minRating);
    if (Number.isFinite(value)) {
      and.push({ averageRating: { gte: value } });
    }
  }
  if (params.ownership) {
    and.push({ ownership: params.ownership as never });
  }

  and.push(...triStateWhere("permitRequired", params.permitRequired));
  and.push(...triStateWhere("membershipRequired", params.membershipRequired));
  and.push(...triStateWhere("flagsRequired", params.flagsRequired));
  and.push(
    ...triStateWhere("sparkArrestorRequired", params.sparkArrestorRequired),
  );

  return { AND: and };
}

/**
 * Build a deterministic Prisma `orderBy` for the requested sort. Distance
 * sort has no SQL equivalent (needs user coords) so it falls back to name —
 * callers detect it via {@link isDistanceSort} and reorder in JS.
 *
 * A `name` + `id` tiebreaker is always appended so pagination is stable even
 * when the primary key has ties or NULLs.
 */
export function buildParkOrderBy(
  params: ParkFilterParams,
): Prisma.ParkOrderByWithRelationInput[] {
  const tiebreak: Prisma.ParkOrderByWithRelationInput[] = [
    { name: "asc" },
    { id: "asc" },
  ];

  switch (params.sort) {
    case "price":
      return [{ dayPassUSD: { sort: "asc", nulls: "last" } }, ...tiebreak];
    case "miles":
      return [{ milesOfTrails: { sort: "desc", nulls: "last" } }, ...tiebreak];
    case "acres":
      return [{ acres: { sort: "desc", nulls: "last" } }, ...tiebreak];
    case "rating":
      return [{ averageRating: { sort: "desc", nulls: "last" } }, ...tiebreak];
    case "difficulty-high":
      return [
        { averageDifficulty: { sort: "desc", nulls: "last" } },
        ...tiebreak,
      ];
    case "difficulty-low":
      return [
        { averageDifficulty: { sort: "asc", nulls: "last" } },
        ...tiebreak,
      ];
    case "most-reviewed":
      return [{ reviewCount: "desc" }, ...tiebreak];
    case "name":
    case "distance-nearest":
    default:
      return tiebreak;
  }
}
