import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const { terrain, difficulty, amenities, ...parkData } = body;

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
        difficulty: {
          deleteMany: {},
          create: difficulty?.map((d: string) => ({ difficulty: d })) || [],
        },
        amenities: {
          deleteMany: {},
          create: amenities?.map((a: string) => ({ amenity: a })) || [],
        },
      },
      include: {
        terrain: true,
        difficulty: true,
        amenities: true,
      },
    });

    // Revalidate cached pages
    revalidatePath("/");
    revalidatePath(`/parks/${park.slug}`);

    return NextResponse.json({ success: true, park });
  } catch (error) {
    console.error("Error updating park:", error);
    return NextResponse.json(
      { error: "Failed to update park" },
      { status: 500 },
    );
  }
}
