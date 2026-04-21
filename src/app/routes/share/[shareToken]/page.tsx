import type { Metadata } from "next";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { RouteWaypoint, SavedRoute } from "@/lib/types";
import { PublicSharedRoute } from "@/features/route-planner/share/PublicSharedRoute";
import { SharedRouteNotFound } from "@/features/route-planner/share/SharedRouteNotFound";

export const dynamic = "force-dynamic";

type SharePageProps = {
  params: Promise<{ shareToken: string }>;
};

async function loadSharedRoute(shareToken: string) {
  const route = await prisma.route.findUnique({ where: { shareToken } });
  if (!route || !route.isPublic) return null;
  return route;
}

export async function generateMetadata({
  params,
}: SharePageProps): Promise<Metadata> {
  const { shareToken } = await params;
  const route = await loadSharedRoute(shareToken);

  if (!route) {
    return {
      title: "Route not found — Offroad Parks",
      description: "This route is no longer shared.",
    };
  }

  const stops = Array.isArray(route.waypoints)
    ? (route.waypoints as unknown as RouteWaypoint[]).length
    : 0;
  const miles = route.totalDistanceMi ? `${route.totalDistanceMi} mi · ` : "";
  const descBase =
    route.description ||
    `${miles}${stops} stops. View this shared offroad route on Offroad Parks.`;

  const title = `${route.title} — Shared Route`;

  return {
    title,
    description: descBase,
    openGraph: {
      title,
      description: descBase,
      type: "article",
    },
    twitter: {
      card: "summary",
      title,
      description: descBase,
    },
  };
}

export default async function SharedRoutePage({ params }: SharePageProps) {
  const { shareToken } = await params;
  const [route, session, hdrs] = await Promise.all([
    loadSharedRoute(shareToken),
    auth(),
    headers(),
  ]);

  if (!route) {
    return <SharedRouteNotFound />;
  }

  const serialized: SavedRoute = {
    id: route.id,
    title: route.title,
    description: route.description,
    shareToken: route.shareToken,
    isPublic: route.isPublic,
    waypoints: (route.waypoints as unknown as RouteWaypoint[]) ?? [],
    routeGeometry:
      (route.routeGeometry as unknown as GeoJSON.LineString | null) ?? null,
    totalDistanceMi: route.totalDistanceMi,
    estimatedDurationMin: route.estimatedDurationMin,
    createdAt: route.createdAt.toISOString(),
    updatedAt: route.updatedAt.toISOString(),
  };

  const user = session?.user
    ? {
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
        role: session.user.role ?? null,
      }
    : null;

  // Build an absolute share URL for signin callbacks. Use the forwarded host
  // when available so the callback lands on the same origin the user visited.
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "";
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const shareUrl = host
    ? `${proto}://${host}/routes/share/${shareToken}`
    : `/routes/share/${shareToken}`;

  return <PublicSharedRoute route={serialized} user={user} shareUrl={shareUrl} />;
}
