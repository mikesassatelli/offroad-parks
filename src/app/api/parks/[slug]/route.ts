import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { transformDbPark } from "@/lib/types";

interface RouteParams {
  params: Promise<{
    slug: string;
  }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { slug } = await params;

    const park = await prisma.park.findUnique({
      where: {
        slug,
        status: "APPROVED",
      },
      include: {
        terrain: true,
        difficulty: true,
        amenities: true,
      },
    });

    if (!park) {
      return NextResponse.json({ error: "Park not found" }, { status: 404 });
    }

    // Transform to client-friendly format
    const transformedPark = transformDbPark(park);

    return NextResponse.json(transformedPark);
  } catch (error) {
    console.error("Error fetching park:", error);
    return NextResponse.json(
      { error: "Failed to fetch park" },
      { status: 500 },
    );
  }
}
