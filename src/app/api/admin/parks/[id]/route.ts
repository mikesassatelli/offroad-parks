import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateMapHeroAsync } from "@/lib/map-hero/generate";
import { normalizeStateName } from "@/lib/us-states";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Delete park (cascade will handle related records)
    const deletedPark = await prisma.park.delete({
      where: { id },
    });

    // Revalidate cached pages
    revalidatePath("/");
    revalidatePath(`/parks/${deletedPark.slug}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting park:", error);
    return NextResponse.json(
      { error: "Failed to delete park" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const {
      terrain,
      amenities,
      camping,
      vehicleTypes,
      address,
      // Strip flat address fields sent by the form alongside the nested address object
      streetAddress: _sa,
      streetAddress2: _sa2,
      addressCity: _ac,
      addressState: _as,
      zipCode: _zc,
      county: _co,
      ...parkData
    } = body;

    // Read existing coords so we can detect a change and regenerate the
    // map hero only when needed (OP-90).
    const existing = await prisma.park.findUnique({
      where: { id },
      select: {
        latitude: true,
        longitude: true,
        address: { select: { latitude: true, longitude: true } },
      },
    });
    const prevLat = existing?.latitude ?? existing?.address?.latitude ?? null;
    const prevLng = existing?.longitude ?? existing?.address?.longitude ?? null;
    const nextLat = parkData.latitude ?? address?.latitude ?? null;
    const nextLng = parkData.longitude ?? address?.longitude ?? null;
    const coordsChanged = prevLat !== nextLat || prevLng !== nextLng;

    // Defensive normalization: the admin edit form now posts canonical state
    // names via the dropdown, but anything else calling this route (future
    // API consumers, bulk edits) could still send a code.
    let normalizedState: string | null = null;
    if (address) {
      if (!address.state) {
        return NextResponse.json(
          { error: "State is required on the address." },
          { status: 400 }
        );
      }
      normalizedState = normalizeStateName(address.state);
      if (!normalizedState) {
        return NextResponse.json(
          {
            error: `Invalid state: "${address.state}". Provide a US state full name or 2-letter code.`,
          },
          { status: 400 }
        );
      }
    }

    // Build address update operation
    const addressOperation = address
      ? {
          upsert: {
            create: {
              streetAddress: address.streetAddress || null,
              streetAddress2: address.streetAddress2 || null,
              city: address.city || null,
              state: normalizedState as string, // validated above
              zipCode: address.zipCode || null,
              county: address.county || null,
              latitude: address.latitude || null,
              longitude: address.longitude || null,
            },
            update: {
              streetAddress: address.streetAddress || null,
              streetAddress2: address.streetAddress2 || null,
              city: address.city || null,
              state: normalizedState as string, // validated above
              zipCode: address.zipCode || null,
              county: address.county || null,
              latitude: address.latitude || null,
              longitude: address.longitude || null,
            },
          },
        }
      : {};

    // Update park with relations
    const park = await prisma.park.update({
      where: { id },
      data: {
        ...parkData,
        // Delete existing relations and recreate
        terrain: {
          deleteMany: {},
          create: terrain?.map((t: string) => ({ terrain: t })) || [],
        },
        amenities: {
          deleteMany: {},
          create: amenities?.map((a: string) => ({ amenity: a })) || [],
        },
        camping: {
          deleteMany: {},
          create: camping?.map((c: string) => ({ camping: c })) || [],
        },
        vehicleTypes: {
          deleteMany: {},
          create:
            vehicleTypes?.map((v: string) => ({ vehicleType: v })) || [],
        },
        address: addressOperation,
      },
      include: {
        terrain: true,
        amenities: true,
        camping: true,
        vehicleTypes: true,
        address: true,
      },
    });

    // Revalidate cached pages
    revalidatePath("/");
    revalidatePath(`/parks/${park.slug}`);

    // Regenerate map hero if coords changed (OP-90).
    if (coordsChanged) {
      generateMapHeroAsync(park.id, "admin-edit");
    }

    return NextResponse.json({ success: true, park });
  } catch (error) {
    console.error("Error updating park:", error);
    return NextResponse.json(
      { error: "Failed to update park" },
      { status: 500 },
    );
  }
}
