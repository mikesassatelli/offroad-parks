import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { RouteWaypoint } from "@/lib/types";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/routes/[id]
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await auth();

  const route = await prisma.route.findUnique({ where: { id } });

  if (!route) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Private routes require ownership
  if (!route.isPublic && route.userId !== session?.user?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(route);
}

// PATCH /api/routes/[id]
export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const route = await prisma.route.findUnique({ where: { id } });

  if (!route) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (route.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const updated = await prisma.route.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
      ...(body.waypoints !== undefined && { waypoints: body.waypoints as object[] }),
      ...(body.routeGeometry !== undefined && {
        routeGeometry: (body.routeGeometry as object) ?? null,
      }),
      ...(body.totalDistanceMi !== undefined && {
        totalDistanceMi: body.totalDistanceMi,
      }),
      ...(body.estimatedDurationMin !== undefined && {
        estimatedDurationMin: body.estimatedDurationMin,
      }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/routes/[id]
export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const route = await prisma.route.findUnique({ where: { id } });

  if (!route) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (route.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.route.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
