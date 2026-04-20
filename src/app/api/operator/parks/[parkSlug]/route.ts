import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ parkSlug: string }>;
};

// Scalar fields that operators are allowed to edit
const ALLOWED_SCALAR_FIELDS = new Set([
  "name",
  "website",
  "phone",
  "campingWebsite",
  "campingPhone",
  "notes",
  "datesOpen",
  "contactEmail",
  "isFree",
  "dayPassUSD",
  "vehicleEntryFeeUSD",
  "riderFeeUSD",
  "membershipFeeUSD",
  "milesOfTrails",
  "acres",
  "permitRequired",
  "permitType",
  "membershipRequired",
  "maxVehicleWidthInches",
  "flagsRequired",
  "sparkArrestorRequired",
  "helmetsRequired",
  "noiseLimitDBA",
]);

// Array/relation fields that operators can update
const ALLOWED_ARRAY_FIELDS = new Set(["terrain", "amenities", "camping", "vehicleTypes"]);

type PatchBody = Record<string, unknown>;

const PARK_SCALAR_SELECT = {
  id: true,
  name: true,
  slug: true,
  website: true,
  phone: true,
  campingWebsite: true,
  campingPhone: true,
  notes: true,
  datesOpen: true,
  contactEmail: true,
  isFree: true,
  dayPassUSD: true,
  vehicleEntryFeeUSD: true,
  riderFeeUSD: true,
  membershipFeeUSD: true,
  milesOfTrails: true,
  acres: true,
  permitRequired: true,
  permitType: true,
  membershipRequired: true,
  maxVehicleWidthInches: true,
  flagsRequired: true,
  sparkArrestorRequired: true,
  helmetsRequired: true,
  noiseLimitDBA: true,
} as const;

const PARK_ARRAY_SELECT = {
  terrain: { select: { terrain: true } },
  amenities: { select: { amenity: true } },
  camping: { select: { camping: true } },
  vehicleTypes: { select: { vehicleType: true } },
} as const;

function transformArrayRelations(park: {
  terrain: { terrain: string }[];
  amenities: { amenity: string }[];
  camping: { camping: string }[];
  vehicleTypes: { vehicleType: string }[];
}) {
  return {
    terrain: park.terrain.map((t) => t.terrain),
    amenities: park.amenities.map((a) => a.amenity),
    camping: park.camping.map((c) => c.camping),
    vehicleTypes: park.vehicleTypes.map((v) => v.vehicleType),
  };
}

// PATCH /api/operator/parks/[parkSlug]
// Operators update their park listing. Changes are written without admin moderation
// and logged to ParkEditLog for audit purposes.
export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { parkSlug } = await params;

  // Verify operator membership
  const park = await prisma.park.findUnique({
    where: { slug: parkSlug, status: "APPROVED" },
    select: {
      ...PARK_SCALAR_SELECT,
      ...PARK_ARRAY_SELECT,
      operator: {
        select: {
          users: {
            where: { userId: session.user.id },
            select: { role: true },
          },
        },
      },
    },
  });

  if (!park) {
    return NextResponse.json({ error: "Park not found" }, { status: 404 });
  }

  if (!park.operator || park.operator.users.length === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Filter to only allowed scalar fields
  const updateData: PatchBody = {};
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_SCALAR_FIELDS.has(key)) continue;
    const currentValue = (park as Record<string, unknown>)[key];
    if (currentValue !== value) {
      updateData[key] = value;
      changes[key] = { from: currentValue, to: value };
    }
  }

  // Collect array field updates
  const currentArrays = transformArrayRelations(park);
  const arrayUpdates: Record<string, string[]> = {};

  for (const field of ALLOWED_ARRAY_FIELDS) {
    if (field in body && Array.isArray(body[field])) {
      const incoming = body[field] as string[];
      const current = currentArrays[field as keyof typeof currentArrays];
      const incomingSorted = [...incoming].sort().join(",");
      const currentSorted = [...current].sort().join(",");
      if (incomingSorted !== currentSorted) {
        arrayUpdates[field] = incoming;
        changes[field] = { from: current, to: incoming };
      }
    }
  }

  const hasScalarChanges = Object.keys(updateData).length > 0;
  const hasArrayChanges = Object.keys(arrayUpdates).length > 0;

  if (!hasScalarChanges && !hasArrayChanges) {
    return NextResponse.json({ message: "No changes detected" }, { status: 200 });
  }

  // Apply update and write audit log in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Update scalar fields
    if (hasScalarChanges) {
      await tx.park.update({
        where: { id: park.id },
        data: updateData,
      });
    }

    // Update array relations
    if (arrayUpdates.terrain !== undefined) {
      await tx.parkTerrain.deleteMany({ where: { parkId: park.id } });
      if (arrayUpdates.terrain.length > 0) {
        await tx.parkTerrain.createMany({
          data: arrayUpdates.terrain.map((terrain) => ({ parkId: park.id, terrain: terrain as never })),
        });
      }
    }
    if (arrayUpdates.amenities !== undefined) {
      await tx.parkAmenity.deleteMany({ where: { parkId: park.id } });
      if (arrayUpdates.amenities.length > 0) {
        await tx.parkAmenity.createMany({
          data: arrayUpdates.amenities.map((amenity) => ({ parkId: park.id, amenity: amenity as never })),
        });
      }
    }
    if (arrayUpdates.camping !== undefined) {
      await tx.parkCamping.deleteMany({ where: { parkId: park.id } });
      if (arrayUpdates.camping.length > 0) {
        await tx.parkCamping.createMany({
          data: arrayUpdates.camping.map((camping) => ({ parkId: park.id, camping: camping as never })),
        });
      }
    }
    if (arrayUpdates.vehicleTypes !== undefined) {
      await tx.parkVehicleType.deleteMany({ where: { parkId: park.id } });
      if (arrayUpdates.vehicleTypes.length > 0) {
        await tx.parkVehicleType.createMany({
          data: arrayUpdates.vehicleTypes.map((vehicleType) => ({ parkId: park.id, vehicleType: vehicleType as never })),
        });
      }
    }

    await tx.parkEditLog.create({
      data: {
        parkId: park.id,
        userId: session!.user!.id ?? "",
        changes: JSON.stringify(changes),
      },
    });

    // Re-fetch updated park with all fields
    return tx.park.findUnique({
      where: { id: park.id },
      select: {
        ...PARK_SCALAR_SELECT,
        ...PARK_ARRAY_SELECT,
      },
    });
  });

  if (!result) {
    return NextResponse.json({ error: "Failed to fetch updated park" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    park: {
      ...result,
      ...transformArrayRelations(result),
    },
  });
}

// GET /api/operator/parks/[parkSlug]
// Returns the park details for the operator edit form.
export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { parkSlug } = await params;

  const park = await prisma.park.findUnique({
    where: { slug: parkSlug, status: "APPROVED" },
    select: {
      ...PARK_SCALAR_SELECT,
      ...PARK_ARRAY_SELECT,
      operator: {
        select: {
          users: {
            where: { userId: session.user.id },
            select: { role: true },
          },
        },
      },
    },
  });

  if (!park) {
    return NextResponse.json({ error: "Park not found" }, { status: 404 });
  }

  if (!park.operator || park.operator.users.length === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { operator: _operator, ...parkData } = park;

  return NextResponse.json({
    park: {
      ...parkData,
      ...transformArrayRelations(park),
    },
  });
}
