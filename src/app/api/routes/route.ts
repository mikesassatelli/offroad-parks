import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { RouteWaypoint } from "@/lib/types";

export const runtime = "nodejs";

// GET /api/routes — list authenticated user's routes
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const routes = await prisma.route.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(routes);
}

// POST /api/routes — create a new route
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    title?: string;
    description?: string;
    isPublic?: boolean;
    waypoints?: RouteWaypoint[];
    routeGeometry?: GeoJSON.LineString | null;
    totalDistanceMi?: number | null;
    estimatedDurationMin?: number | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  if (!Array.isArray(body.waypoints) || body.waypoints.length < 2) {
    return NextResponse.json(
      { error: "At least 2 waypoints are required" },
      { status: 400 },
    );
  }

  const route = await prisma.route.create({
    data: {
      userId: session.user.id,
      title: body.title.trim(),
      description: body.description ?? null,
      isPublic: body.isPublic ?? false,
      waypoints: body.waypoints as object[],
      routeGeometry: (body.routeGeometry as object) ?? null,
      totalDistanceMi: body.totalDistanceMi ?? null,
      estimatedDurationMin: body.estimatedDurationMin ?? null,
    },
  });

  return NextResponse.json(route, { status: 201 });
}
