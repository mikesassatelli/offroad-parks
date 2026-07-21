/**
 * Server-side park querying for the home page.
 *
 * Centralises the Prisma reads used by the paginated list endpoint, the map
 * markers endpoint, and the server-rendered first page so the filter/sort
 * logic (via `src/lib/park-filters.ts`) is applied in exactly one place.
 */
import { prisma } from "@/lib/prisma";
import { resolveParkHeroImage } from "@/lib/park-hero";
import {
  transformDbPark,
  type DbPark,
  type Park,
  type ParkCardAlertSummary,
} from "@/lib/types";
import { getBatchParkCardWeather } from "@/lib/weather";
import { haversineDistance } from "@/lib/geo";
import {
  buildParkOrderBy,
  buildParkWhere,
  isDistanceSort,
  PARK_PAGE_SIZE,
  type ParkFilterParams,
} from "@/lib/park-filters";

/** Full relation graph needed to build a card-shaped `Park` (mirrors the
 *  include the home page has always used). */
const parkCardInclude = {
  terrain: true,
  amenities: true,
  camping: true,
  vehicleTypes: true,
  address: true,
  photos: {
    where: { status: "APPROVED" as const },
    take: 1,
    orderBy: { createdAt: "desc" as const },
    select: { id: true, url: true, status: true },
  },
  heroPhoto: {
    select: { id: true, url: true, status: true },
  },
  trailConditions: {
    where: { reportStatus: "PUBLISHED" as const },
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { id: true, status: true, reportStatus: true, createdAt: true },
  },
} as const;

export interface ParkPage {
  parks: Park[];
  hasMore: boolean;
  nextPage: number | null;
  total: number;
}

/**
 * Active official-closure alerts for a set of park DB ids, aggregated per park
 * into the card badge shape. One indexed query for the whole page — cheap
 * relative to the weather fan-out. Uses the same active predicate as the detail
 * page (isActive + not-expired + already-started).
 */
async function getBatchOfficialClosures(
  parkDbIds: string[],
): Promise<Map<string, ParkCardAlertSummary["officialClosure"]>> {
  const out = new Map<string, ParkCardAlertSummary["officialClosure"]>();
  if (parkDbIds.length === 0) return out;

  const now = new Date();
  const rows = await prisma.parkAlert.findMany({
    where: {
      parkId: { in: parkDbIds },
      category: "OFFICIAL_CLOSURE",
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }],
    },
    select: { parkId: true, severity: true },
  });

  for (const r of rows) {
    // DANGER (full closure) outranks WARNING (limited use) for the badge.
    const severity: "DANGER" | "WARNING" =
      r.severity === "DANGER" ? "DANGER" : "WARNING";
    const prev = out.get(r.parkId);
    out.set(r.parkId, {
      severity:
        prev?.severity === "DANGER" || severity === "DANGER"
          ? "DANGER"
          : "WARNING",
      count: (prev?.count ?? 0) + 1,
    });
  }
  return out;
}

/** Shape hero image + today's rain + alert badges onto a page of raw Prisma
 *  parks. The expensive weather fan-out is bounded to just this page; the
 *  closure lookup is a single indexed query. */
export async function decorateParks(dbParks: unknown[]): Promise<Park[]> {
  const rows = dbParks as Array<
    DbPark & {
      latitude: number | null;
      longitude: number | null;
      address: { latitude: number | null; longitude: number | null } | null;
    }
  >;

  const [cardWeather, closures] = await Promise.all([
    getBatchParkCardWeather(
      rows.map((p) => ({
        parkId: p.id,
        latitude: p.latitude ?? p.address?.latitude ?? null,
        longitude: p.longitude ?? p.address?.longitude ?? null,
      })),
    ),
    getBatchOfficialClosures(rows.map((p) => p.id)),
  ]);

  return rows.map((park) => {
    const weather = cardWeather.get(park.id);
    return {
      ...transformDbPark(park),
      heroImage: resolveParkHeroImage(park as never),
      todaysRainChance: weather?.rainChance ?? null,
      alertSummary: {
        officialClosure: closures.get(park.id) ?? null,
        severeWeather: weather?.severeWeather ?? null,
      },
    };
  });
}

/**
 * Fetch one page of fully-shaped parks for the list view.
 *
 * Non-distance sorts are ordered + paginated entirely in Prisma so the DB
 * only materialises one page. Distance sort has no SQL equivalent, so we load
 * the matching set, order by great-circle distance in JS, then slice — but the
 * costly hero/weather decoration still only runs on the returned page.
 *
 * @param page zero-based page index.
 */
export async function getParkPage(
  params: ParkFilterParams,
  page: number,
  pageSize: number = PARK_PAGE_SIZE,
): Promise<ParkPage> {
  const where = buildParkWhere(params);
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 0;
  const skip = safePage * pageSize;

  if (isDistanceSort(params.sort) && params.userLat != null && params.userLng != null) {
    const userLat = params.userLat;
    const userLng = params.userLng;

    // Load matching parks (name-ordered for a stable base), then sort by
    // distance. Parks without coordinates sort last (Infinity), matching the
    // client comparator.
    const all = await prisma.park.findMany({
      where,
      include: parkCardInclude,
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });

    const withDistance = all.map((p) => ({
      park: p,
      distance: p.latitude != null && p.longitude != null
        ? haversineDistance(userLat, userLng, p.latitude, p.longitude)
        : Number.POSITIVE_INFINITY,
    }));
    withDistance.sort((a, b) => a.distance - b.distance);

    const total = withDistance.length;
    const slice = withDistance.slice(skip, skip + pageSize).map((d) => d.park);
    const parks = await decorateParks(slice);
    const hasMore = skip + pageSize < total;
    return { parks, hasMore, nextPage: hasMore ? safePage + 1 : null, total };
  }

  const [total, dbParks] = await Promise.all([
    prisma.park.count({ where }),
    prisma.park.findMany({
      where,
      include: parkCardInclude,
      orderBy: buildParkOrderBy(params),
      skip,
      take: pageSize,
    }),
  ]);

  const parks = await decorateParks(dbParks);
  const hasMore = skip + parks.length < total;
  return { parks, hasMore, nextPage: hasMore ? safePage + 1 : null, total };
}

/** Minimal fields the map markers + popups + route-builder need. */
const parkMarkerSelect = {
  slug: true,
  name: true,
  latitude: true,
  longitude: true,
  isFree: true,
  dayPassUSD: true,
  vehicleEntryFeeUSD: true,
  riderFeeUSD: true,
  membershipFeeUSD: true,
  milesOfTrails: true,
  acres: true,
  address: { select: { city: true, state: true } },
} as const;

type ParkMarkerRow = {
  slug: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  isFree: boolean | null;
  dayPassUSD: number | null;
  vehicleEntryFeeUSD: number | null;
  riderFeeUSD: number | null;
  membershipFeeUSD: number | null;
  milesOfTrails: number | null;
  acres: number | null;
  address: { city: string | null; state: string } | null;
};

/** Build a card-compatible `Park` carrying only the fields the map view reads.
 *  Relation arrays are empty (markers never render terrain/amenities). */
export function toMarkerPark(row: ParkMarkerRow): Park {
  return {
    id: row.slug, // Park.id is the slug (see transformDbPark)
    name: row.name,
    coords:
      row.latitude != null && row.longitude != null
        ? { lat: row.latitude, lng: row.longitude }
        : undefined,
    isFree: row.isFree ?? undefined,
    dayPassUSD: row.dayPassUSD ?? undefined,
    vehicleEntryFeeUSD: row.vehicleEntryFeeUSD ?? undefined,
    riderFeeUSD: row.riderFeeUSD ?? undefined,
    membershipFeeUSD: row.membershipFeeUSD ?? undefined,
    milesOfTrails: row.milesOfTrails ?? undefined,
    acres: row.acres ?? undefined,
    terrain: [],
    amenities: [],
    camping: [],
    vehicleTypes: [],
    address: {
      city: row.address?.city ?? undefined,
      state: row.address?.state ?? "Unknown",
    },
  };
}

/**
 * Fetch ALL parks matching the filters as lightweight markers. No pagination —
 * the map needs the full filtered set — but each object is a small projection
 * so the payload stays bounded.
 */
export async function getParkMarkers(params: ParkFilterParams): Promise<Park[]> {
  const where = buildParkWhere(params);
  const rows = await prisma.park.findMany({
    where,
    select: parkMarkerSelect,
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
  return rows.map(toMarkerPark);
}

export interface ParkFacets {
  states: string[];
  maxTrailMiles: number;
  maxAcres: number;
}

/**
 * Static facets for the Filters panel — the list of states plus the slider
 * upper bounds. Computed over ALL approved parks (unfiltered) so the controls
 * don't shrink as the user narrows results. Cheap aggregate queries.
 */
export async function getParkFacets(): Promise<ParkFacets> {
  const [addresses, aggregate] = await Promise.all([
    prisma.address.findMany({
      where: { park: { status: "APPROVED" } },
      select: { state: true },
      distinct: ["state"],
      orderBy: { state: "asc" },
    }),
    prisma.park.aggregate({
      where: { status: "APPROVED" },
      _max: { milesOfTrails: true, acres: true },
    }),
  ]);

  return {
    states: addresses.map((a) => a.state).filter(Boolean).sort(),
    maxTrailMiles: aggregate._max.milesOfTrails ?? 500,
    maxAcres: aggregate._max.acres ?? 10000,
  };
}
