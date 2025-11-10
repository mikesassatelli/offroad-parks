import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Terrain, Difficulty, Amenity } from "@prisma/client";

export const runtime = "nodejs";

interface SubmitParkRequest {
  name: string;
  slug: string;
  city?: string;
  state: string;
  latitude?: number | null;
  longitude?: number | null;
  website?: string;
  phone?: string;
  dayPassUSD?: number | null;
  milesOfTrails?: number | null;
  acres?: number | null;
  notes?: string;
  submitterName?: string;
  terrain: string[];
  difficulty: string[];
  amenities: string[];
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = (session.user as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN";

  try {
    const data: SubmitParkRequest = await request.json();

    // Validate required fields
    if (!data.name || !data.state) {
      return NextResponse.json(
        { error: "Name and state are required" },
        { status: 400 },
      );
    }

    if (!data.terrain || data.terrain.length === 0) {
      return NextResponse.json(
        { error: "At least one terrain type is required" },
        { status: 400 },
      );
    }

    if (!data.difficulty || data.difficulty.length === 0) {
      return NextResponse.json(
        { error: "At least one difficulty level is required" },
        { status: 400 },
      );
    }

    // Generate slug if not provided (for non-admin submissions)
    let slug = data.slug;
    if (!slug) {
      slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }

    // Check if slug already exists
    const existingPark = await prisma.park.findUnique({
      where: { slug },
    });

    if (existingPark) {
      // Add a unique suffix if slug exists
      slug = `${slug}-${Date.now()}`;
    }

    // Create the park
    const park = await prisma.park.create({
      data: {
        name: data.name,
        slug,
        city: data.city || null,
        state: data.state,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        website: data.website || null,
        phone: data.phone || null,
        dayPassUSD: data.dayPassUSD || null,
        milesOfTrails: data.milesOfTrails || null,
        acres: data.acres || null,
        notes: data.notes || null,
        submitterId: session.user.id,
        submitterName: data.submitterName || null,
        // Admin submissions are auto-approved
        status: isAdmin ? "APPROVED" : "PENDING",
        terrain: {
          create: data.terrain.map((t) => ({
            terrain: t as Terrain,
          })),
        },
        difficulty: {
          create: data.difficulty.map((d) => ({
            difficulty: d as Difficulty,
          })),
        },
        amenities: {
          create: data.amenities.map((a) => ({
            amenity: a as Amenity,
          })),
        },
      },
      include: {
        terrain: true,
        difficulty: true,
        amenities: true,
      },
    });

    return NextResponse.json({ success: true, park });
  } catch (error) {
    console.error("Park submission error:", error);
    return NextResponse.json(
      { error: "Failed to create park" },
      { status: 500 },
    );
  }
}
