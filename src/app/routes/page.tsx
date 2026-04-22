import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { RouteWaypoint, SavedRoute } from "@/lib/types";
import { SavedRoutesPageClient } from "@/features/route-planner/SavedRoutesPageClient";

export const dynamic = "force-dynamic";

export default async function SavedRoutesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/api/auth/signin?callbackUrl=/routes");
  }

  const dbRoutes = await prisma.route.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  // Serialize Date fields to ISO strings for the client component.
  const routes: SavedRoute[] = dbRoutes.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    shareToken: r.shareToken,
    isPublic: r.isPublic,
    waypoints: (r.waypoints as unknown as RouteWaypoint[]) ?? [],
    routeGeometry: (r.routeGeometry as unknown as GeoJSON.LineString | null) ?? null,
    totalDistanceMi: r.totalDistanceMi,
    estimatedDurationMin: r.estimatedDurationMin,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  const user = {
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    image: session.user.image ?? null,
    role: session.user.role ?? null,
  };

  return <SavedRoutesPageClient initialRoutes={routes} user={user} />;
}
