import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveParkHeroImage } from "@/lib/park-hero";
import { transformDbPark } from "@/lib/types";
import { ParkDetailPage } from "@/features/parks/detail/ParkDetailPage";
import { auth } from "@/lib/auth";
import { isAlertActive, sortAlertsForDisplay } from "@/lib/park-alerts";
import type { ParkAlertDisplay } from "@/components/parks/ParkAlertsBanner";
import { getActiveAlerts, getCurrentConditions, getForecast } from "@/lib/weather";
import { SITE_URL } from "@/lib/site";
import { JsonLd } from "@/components/seo/JsonLd";

interface ParkPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Make a possibly-relative image/path URL absolute for use in social-card
 * metadata and JSON-LD (crawlers require absolute URLs). Returns undefined
 * when there is no URL to absolutize.
 */
function toAbsoluteUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}/${url.replace(/^\//, "")}`;
}

/* v8 ignore next - tested via E2E */
export async function generateStaticParams() {
  const parks = await prisma.park.findMany({
    where: {
      status: "APPROVED",
    },
    select: {
      slug: true,
    },
  });

  return parks.map((park) => ({
    id: park.slug,
  }));
}

export async function generateMetadata({ params }: ParkPageProps) {
  const { id } = await params;

  const dbPark = await prisma.park.findUnique({
    where: {
      slug: id,
      status: "APPROVED",
    },
    include: {
      terrain: true,
      amenities: true,
      camping: true,
      vehicleTypes: true,
      address: true,
      heroPhoto: { select: { id: true, url: true, status: true } },
    },
  });

  if (!dbPark) {
    return {
      title: "Park Not Found",
    };
  }

  const park = transformDbPark(dbPark);

  const title = `${park.name} - Offroad Parks`;
  const description =
    park.notes ||
    `Information about ${park.name} in ${park.address.city ? `${park.address.city}, ` : ""}${park.address.state}`;
  const url = `${SITE_URL}/parks/${dbPark.slug}`;

  // Resolve the operator-controlled hero image (same priority as the detail
  // page), falling back to the generated map hero, and absolutize it so the
  // social-card crawlers can fetch it.
  const approvedPhotos = await prisma.parkPhoto.findMany({
    where: { parkId: dbPark.id, status: "APPROVED" },
    select: { id: true, url: true },
    orderBy: { createdAt: "desc" },
  });
  const heroImage = resolveParkHeroImage({
    heroSource: dbPark.heroSource,
    heroPhotoId: dbPark.heroPhotoId,
    heroPhoto: dbPark.heroPhoto,
    photos: (approvedPhotos ?? []).map((p) => ({ id: p.id, url: p.url, status: "APPROVED" as const })),
  });
  const image = toAbsoluteUrl(heroImage ?? dbPark.mapHeroUrl);
  const images = image ? [image] : undefined;

  return {
    title,
    description,
    openGraph: {
      type: "article",
      title,
      description,
      url,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(images ? { images } : {}),
    },
  };
}

export default async function ParkPage({ params }: ParkPageProps) {
  const { id } = await params;
  const session = await auth();

  const dbPark = await prisma.park.findUnique({
    where: {
      slug: id,
      status: "APPROVED",
    },
    include: {
      terrain: true,
      amenities: true,
      camping: true,
      vehicleTypes: true,
      address: true,
      operator: { select: { name: true } },
      // Include the operator-selected hero photo so the detail-page header
      // image can mirror the park-card image (heroSource = PHOTO).
      heroPhoto: { select: { id: true, url: true, status: true } },
    },
  });

  if (!dbPark) {
    notFound();
  }

  // Resolve the operator display name: prefer the per-park override when it is
  // a non-empty trimmed string, otherwise fall back to the operator org name.
  const override = dbPark.operatorDisplayName?.trim();
  const resolvedOperatorName = override && override.length > 0
    ? override
    : (dbPark.operator?.name ?? null);

  // Fetch approved photos for this park
  const photos = await prisma.parkPhoto.findMany({
    where: {
      parkId: dbPark.id,
      status: "APPROVED",
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Resolve the operator-controlled header image. Mirrors the same source
  // priority used on the park-card grid (`src/app/page.tsx`):
  //   - heroSource = PHOTO → operator-selected photo URL
  //   - heroSource = AUTO  → first APPROVED photo URL (or null → map hero)
  //   - heroSource = MAP   → null (sidebar falls back to ParkMapHero)
  // Without this the detail page always rendered the auto-generated map
  // hero, ignoring the operator's choice from the operator portal.
  const resolvedHeroImage = resolveParkHeroImage({
    heroSource: dbPark.heroSource,
    heroPhotoId: dbPark.heroPhotoId,
    heroPhoto: dbPark.heroPhoto,
    photos: photos.map((p) => ({ id: p.id, url: p.url, status: "APPROVED" })),
  });

  const park = {
    ...transformDbPark(dbPark),
    heroImage: resolvedHeroImage,
  };

  // Fetch active operator-posted alerts. Filter in JS so the predicate stays in
  // one place (src/lib/park-alerts#isAlertActive) and is unit-testable.
  const now = new Date();
  const candidateAlerts = await prisma.parkAlert.findMany({
    where: {
      parkId: dbPark.id,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: {
      id: true,
      title: true,
      body: true,
      severity: true,
      category: true,
      startsAt: true,
      expiresAt: true,
      isActive: true,
      createdAt: true,
    },
  });
  const activeAlerts: ParkAlertDisplay[] = sortAlertsForDisplay(
    candidateAlerts.filter((a) => isAlertActive(a, now))
  ).map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    severity: a.severity,
    category: a.category,
    createdAt: a.createdAt.toISOString(),
  }));

  // OP-53: weather data. Fetched in parallel; each surface degrades to
  // null/empty independently on failure (NWS occasionally 5xx, outside-US
  // coords resolve as null). Coords come from the park root, falling back
  // to the address record — same precedence as map-hero generation.
  const weatherLat = dbPark.latitude ?? dbPark.address?.latitude ?? null;
  const weatherLng = dbPark.longitude ?? dbPark.address?.longitude ?? null;
  const [weatherCurrent, weatherForecast, weatherAlerts] =
    weatherLat != null && weatherLng != null
      ? await Promise.all([
          getCurrentConditions(dbPark.id, weatherLat, weatherLng),
          getForecast(dbPark.id, weatherLat, weatherLng),
          getActiveAlerts(dbPark.id, weatherLat, weatherLng),
        ])
      : [null, [], []];

  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  // Fetch any existing claim from this user for this park (any status)
  const existingClaim = session?.user?.id
    ? await prisma.parkClaim.findUnique({
        where: { parkId_userId: { parkId: dbPark.id, userId: session.user.id } },
        select: { status: true, reviewNotes: true },
      })
    : null;

  // Check if the current user is an operator of this park
  const isOperatorOfPark =
    session?.user?.id && dbPark.operatorId
      ? !!(await prisma.operatorUser.findUnique({
          where: {
            operatorId_userId: { operatorId: dbPark.operatorId, userId: session.user.id },
          },
          select: { id: true },
        }))
      : false;

  // Build schema.org TouristAttraction structured data for rich results.
  const canonicalUrl = `${SITE_URL}/parks/${dbPark.slug}`;
  const absoluteHero = toAbsoluteUrl(park.heroImage ?? park.mapHeroUrl);
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: park.name,
    url: canonicalUrl,
    ...(park.notes ? { description: park.notes } : {}),
    ...(absoluteHero ? { image: absoluteHero } : {}),
    address: {
      "@type": "PostalAddress",
      ...(park.address.streetAddress ? { streetAddress: park.address.streetAddress } : {}),
      ...(park.address.city ? { addressLocality: park.address.city } : {}),
      addressRegion: park.address.state,
      ...(park.address.zipCode ? { postalCode: park.address.zipCode } : {}),
    },
    ...(park.coords
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: park.coords.lat,
            longitude: park.coords.lng,
          },
        }
      : {}),
    ...(park.averageRating != null && (park.reviewCount ?? 0) > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: park.averageRating,
            reviewCount: park.reviewCount,
          },
        }
      : {}),
  };

  return (
    <>
    <JsonLd data={jsonLd} />
    <ParkDetailPage
      park={park}
      photos={photos}
      currentUserId={session?.user?.id}
      isAdmin={isAdmin}
      parkDbId={dbPark.id}
      existingClaim={existingClaim}
      isOperatorOfPark={isOperatorOfPark}
      operatorName={resolvedOperatorName}
      alerts={activeAlerts}
      weatherCurrent={weatherCurrent}
      weatherForecast={weatherForecast}
      weatherAlerts={weatherAlerts}
    />
    </>
  );
}
