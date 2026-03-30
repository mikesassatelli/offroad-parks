import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ parkSlug: string }>;
};

// Fields that operators are allowed to edit (no admin moderation needed)
const ALLOWED_FIELDS = new Set([
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
  "noiseLimitDBA",
]);

type PatchBody = Record<string, unknown>;

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
      id: true,
      name: true,
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
      noiseLimitDBA: true,
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

  // Filter to only allowed fields
  const updateData: PatchBody = {};
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_FIELDS.has(key)) continue;
    const currentValue = (park as Record<string, unknown>)[key];
    if (currentValue !== value) {
      updateData[key] = value;
      changes[key] = { from: currentValue, to: value };
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ message: "No changes detected" }, { status: 200 });
  }

  // Apply update and write audit log in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.park.update({
      where: { id: park.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        website: true,
        phone: true,
        notes: true,
        datesOpen: true,
        contactEmail: true,
        isFree: true,
        dayPassUSD: true,
        vehicleEntryFeeUSD: true,
        riderFeeUSD: true,
        membershipFeeUSD: true,
      },
    });

    await tx.parkEditLog.create({
      data: {
        parkId: park.id,
        userId: session!.user!.id ?? "",
        changes: JSON.stringify(changes),
      },
    });

    return updated;
  });

  return NextResponse.json({ success: true, park: result });
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
      noiseLimitDBA: true,
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

  return NextResponse.json({ park });
}
