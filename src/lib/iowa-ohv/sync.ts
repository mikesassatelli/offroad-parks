import type { PrismaClient, ParkAlertSeverity } from "@prisma/client";
import {
  fetchIowaOhvAlerts,
  type IowaOhvAlert,
} from "@/lib/iowa-ohv/parse";

/**
 * All Iowa DNR OHV alerts are posted under a single dedicated system user. That
 * user id doubles as the "source" marker: any ParkAlert authored by it was
 * created by this scraper (never by a human operator), so the daily sync can
 * safely update / deactivate its own alerts without ever touching operator-
 * authored ones.
 */
export const IOWA_OHV_BOT_EMAIL = "iowa-dnr-ohv-bot@system.offroadparks.com";
export const IOWA_OHV_BOT_NAME = "Iowa DNR OHV Alerts";

/** State values that identify an Iowa park in the Address table. */
const IOWA_STATE_VALUES = ["Iowa", "IA"];

/** Words dropped when normalizing park names for matching. */
const NAME_STOPWORDS = new Set([
  "ohv",
  "orv",
  "park",
  "area",
  "recreation",
  "wildlife",
  "state",
  "the",
  "and",
  "of",
]);

export interface IowaOhvSyncSummary {
  scraped: number;
  matched: number;
  created: number;
  updated: number;
  unchanged: number;
  deactivated: number;
  /** Park names from the DNR page that did not match a park in our DB. */
  unmatched: string[];
}

/**
 * Normalize a park name to a set of significant tokens for fuzzy matching.
 * Lowercases, splits on non-alphanumerics (so "Nicholson-Ford" → nicholson,
 * ford), and drops generic stopwords like "OHV" / "Park".
 */
function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t && !NAME_STOPWORDS.has(t));
}

function tokenKey(name: string): string {
  return nameTokens(name).sort().join(" ");
}

type MatchablePark = {
  id: string;
  name: string;
  address: { county: string | null } | null;
};

/**
 * Find the park in `parks` that best matches a scraped DNR alert. Requires a
 * confident match (identical significant-token set, or one token set fully
 * containing the other with the county in agreement). Returns null otherwise,
 * so ambiguous entries are logged as unmatched rather than mis-attributed.
 */
export function matchPark(
  alert: IowaOhvAlert,
  parks: MatchablePark[]
): MatchablePark | null {
  const alertKey = tokenKey(alert.parkName);
  const alertTokens = new Set(nameTokens(alert.parkName));

  // 1. Exact significant-token match.
  const exact = parks.filter((p) => tokenKey(p.name) === alertKey);
  if (exact.length === 1) return exact[0];

  // 2. Subset/superset containment, disambiguated by county when needed.
  const countyMatch = (p: MatchablePark) =>
    !!alert.county &&
    !!p.address?.county &&
    p.address.county.toLowerCase().replace(/\s+county$/i, "").trim() ===
      alert.county.toLowerCase().trim();

  const contains = parks.filter((p) => {
    const pTokens = new Set(nameTokens(p.name));
    if (pTokens.size === 0 || alertTokens.size === 0) return false;
    const aInP = [...alertTokens].every((t) => pTokens.has(t));
    const pInA = [...pTokens].every((t) => alertTokens.has(t));
    return aInP || pInA;
  });

  if (contains.length === 1) return contains[0];
  if (contains.length > 1) {
    const byCounty = contains.filter(countyMatch);
    if (byCounty.length === 1) return byCounty[0];
  }

  if (exact.length > 1) {
    const byCounty = exact.filter(countyMatch);
    if (byCounty.length === 1) return byCounty[0];
  }

  return null;
}

/** Map a DNR status label to a ParkAlert severity. */
export function severityForAlert(alert: IowaOhvAlert): ParkAlertSeverity {
  if (alert.closed) return "DANGER";
  return "WARNING";
}

/** Build a concise banner title (≤200 chars) from a status label. */
export function alertTitle(alert: IowaOhvAlert): string {
  const label = alert.closed
    ? "Park Closed"
    : alert.limited
      ? "Park Open — Limited Use"
      : titleCase(alert.statusLabel);
  return label.slice(0, 200);
}

/** Build the banner body: reason, extended note, effective date, attribution. */
export function alertBody(alert: IowaOhvAlert): string {
  const parts: string[] = [];
  if (alert.reason) parts.push(alert.reason);
  if (alert.extraBody && alert.extraBody !== alert.reason)
    parts.push(alert.extraBody);
  if (alert.effectiveDate) parts.push(`Effective ${alert.effectiveDate}.`);
  parts.push("Source: Iowa DNR OHV Alerts.");
  return parts.join(" ").trim();
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** Parse a M/D/YYYY effective date to a Date, or null if unparseable. */
function parseEffectiveDate(raw: string | null): Date | null {
  if (!raw) return null;
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, month, day, year] = m;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return isNaN(date.getTime()) ? null : date;
}

/** Upsert the dedicated system user that owns all scraped OHV alerts. */
export async function getOrCreateOhvBotUser(
  prisma: Pick<PrismaClient, "user">
): Promise<string> {
  const user = await prisma.user.upsert({
    where: { email: IOWA_OHV_BOT_EMAIL },
    update: {},
    create: { email: IOWA_OHV_BOT_EMAIL, name: IOWA_OHV_BOT_NAME },
    select: { id: true },
  });
  return user.id;
}

type SyncPrisma = Pick<PrismaClient, "user" | "park" | "parkAlert">;

export interface SyncOptions {
  prisma: SyncPrisma;
  /** Injectable for tests; defaults to the live DNR fetch. */
  fetcher?: () => Promise<IowaOhvAlert[]>;
}

/**
 * Fetch the live Iowa DNR OHV alerts, match each to an approved Iowa park, and
 * reconcile ParkAlert banners:
 *   - matched park with no active bot alert  → create
 *   - matched park with a stale bot alert    → update (title/body/severity)
 *   - matched park with an up-to-date alert  → leave as-is
 *   - active bot alert whose park dropped off → deactivate (closure lifted)
 *
 * Idempotent: running twice with the same page is a no-op after the first run.
 */
export async function syncIowaOhvAlerts({
  prisma,
  fetcher = fetchIowaOhvAlerts,
}: SyncOptions): Promise<IowaOhvSyncSummary> {
  const scraped = await fetcher();

  const botUserId = await getOrCreateOhvBotUser(prisma);

  const iowaParks = await prisma.park.findMany({
    where: {
      status: "APPROVED",
      address: { state: { in: IOWA_STATE_VALUES } },
    },
    select: {
      id: true,
      name: true,
      address: { select: { county: true } },
    },
  });

  // All currently-active alerts this bot owns, keyed by park.
  const activeBotAlerts = await prisma.parkAlert.findMany({
    where: { userId: botUserId, isActive: true },
    select: {
      id: true,
      parkId: true,
      title: true,
      body: true,
      severity: true,
    },
  });
  const activeByPark = new Map<string, (typeof activeBotAlerts)[number][]>();
  for (const a of activeBotAlerts) {
    const list = activeByPark.get(a.parkId) ?? [];
    list.push(a);
    activeByPark.set(a.parkId, list);
  }

  const summary: IowaOhvSyncSummary = {
    scraped: scraped.length,
    matched: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    deactivated: 0,
    unmatched: [],
  };

  const seenParkIds = new Set<string>();

  for (const alert of scraped) {
    const park = matchPark(alert, iowaParks);
    if (!park) {
      summary.unmatched.push(alert.parkName);
      continue;
    }
    summary.matched += 1;
    seenParkIds.add(park.id);

    const title = alertTitle(alert);
    const body = alertBody(alert);
    const severity = severityForAlert(alert);
    const startsAt = parseEffectiveDate(alert.effectiveDate);

    const existing = activeByPark.get(park.id) ?? [];
    if (existing.length === 0) {
      await prisma.parkAlert.create({
        data: {
          parkId: park.id,
          userId: botUserId,
          title,
          body,
          severity,
          startsAt,
          isActive: true,
        },
      });
      summary.created += 1;
      continue;
    }

    // Keep the first active alert current; deactivate any accidental duplicates.
    const [primary, ...dupes] = existing;
    const changed =
      primary.title !== title ||
      primary.body !== body ||
      primary.severity !== severity;
    if (changed) {
      await prisma.parkAlert.update({
        where: { id: primary.id },
        data: { title, body, severity, startsAt },
      });
      summary.updated += 1;
    } else {
      summary.unchanged += 1;
    }
    for (const dupe of dupes) {
      await prisma.parkAlert.update({
        where: { id: dupe.id },
        data: { isActive: false },
      });
      summary.deactivated += 1;
    }
  }

  // Any active bot alert whose park is no longer listed → closure lifted.
  for (const alert of activeBotAlerts) {
    if (!seenParkIds.has(alert.parkId)) {
      await prisma.parkAlert.update({
        where: { id: alert.id },
        data: { isActive: false },
      });
      summary.deactivated += 1;
    }
  }

  return summary;
}
