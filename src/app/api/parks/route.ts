import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { transformDbPark } from "@/lib/types";

export async function GET() {
  try {
    const parks = await prisma.park.findMany({
      where: {
        status: "APPROVED",
      },
      include: {
        terrain: true,
        difficulty: true,
        amenities: true,
        vehicleTypes: true,
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
