import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { transformDbPark } from "@/lib/types";
import { CONDITION_STALE_AFTER_MS } from "@/lib/trail-conditions";

export async function GET() {
  try {
    const parks = await prisma.park.findMany({
      where: {
        status: "APPROVED",
      },
      include: {
        terrain: true,
        amenities: true,
        camping: true,
        vehicleTypes: true,
        address: true,
        trailConditions: {
          where: {
            reportStatus: "PUBLISHED",
            createdAt: { gte: new Date(Date.now() - CONDITION_STALE_AFTER_MS) },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true, reportStatus: true, createdAt: true },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Transform to client-friendly format
    const transformedParks = parks.map(transformDbPark);

    return NextResponse.json(transformedParks);
  } catch (error) {
    console.error("Error fetching parks:", error);
    return NextResponse.json(
      { error: "Failed to fetch parks" },
      { status: 500 },
    );
  }
}
