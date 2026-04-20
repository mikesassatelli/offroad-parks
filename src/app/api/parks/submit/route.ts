import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateMapHeroAsync } from "@/lib/map-hero/generate";
import type {
  Amenity,
  Camping,
  Ownership,
  ParkStatus,
  Terrain,
  VehicleType,
} from "@prisma/client";

export const runtime = "nodejs";

interface OperatorClaimInput {
  claimantName: string;
  claimantEmail: string;
  claimantPhone?: string;
  businessName?: string;
  message?: string;
}

interface SubmitParkRequest {
  name: string;
  slug: string;
  latitude?: number | null;
  longitude?: number | null;
  website?: string;
  phone?: string;
  campingWebsite?: string;
  campingPhone?: string;
  isFree?: boolean | null;
  dayPassUSD?: number | null;
  vehicleEntryFeeUSD?: number | null;
  riderFeeUSD?: number | null;
  membershipFeeUSD?: number | null;
  milesOfTrails?: number | null;
  acres?: number | null;
  notes?: string;
  submitterName?: string;
  terrain: string[];
  amenities: string[];
  camping?: string[];
  vehicleTypes?: string[];
  // New operational fields
  datesOpen?: string;
  contactEmail?: string;
  ownership?: string;
  permitRequired?: boolean;
  permitType?: string;
  membershipRequired?: boolean;
  maxVehicleWidthInches?: number | null;
  flagsRequired?: boolean;
  sparkArrestorRequired?: boolean;
  helmetsRequired?: boolean;
  noiseLimitDBA?: number | null;
  // Address fields (state is required)
  address: {
    streetAddress?: string;
    streetAddress2?: string;
    city?: string;
    state: string;
    zipCode?: string;
    county?: string;
    latitude?: number;
    longitude?: number;
  };
  // Optional operator claim — when present, submitter is asserting they
  // operate this park. A PENDING ParkClaim is created alongside the park
  // in the same transaction. Admin review is still required.
  claim?: OperatorClaimInput;
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
    if (!data.name || !data.address?.state) {
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

    // Validate optional operator claim up-front so we don't create the park
    // only to fail on the claim afterwards.
    if (data.claim) {
      const claimantName = data.claim.claimantName?.trim();
      const claimantEmail = data.claim.claimantEmail?.trim();
      if (!claimantName || !claimantEmail) {
        return NextResponse.json(
          { error: "Claim requires name and email" },
          { status: 400 },
        );
      }
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

    // Create the park (and optional pending operator claim) in a single
    // transaction. If claim creation fails, the park is rolled back so the
    // caller can retry cleanly without an orphaned pending submission.
    const userId = session.user.id;
    const parkCreateArgs = {
      data: {
        name: data.name,
        slug,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        website: data.website || null,
        phone: data.phone || null,
        campingWebsite: data.campingWebsite || null,
        campingPhone: data.campingPhone || null,
        isFree: data.isFree ?? null,
        dayPassUSD: data.dayPassUSD || null,
        vehicleEntryFeeUSD: data.vehicleEntryFeeUSD || null,
        riderFeeUSD: data.riderFeeUSD || null,
        membershipFeeUSD: data.membershipFeeUSD || null,
        milesOfTrails: data.milesOfTrails || null,
        acres: data.acres || null,
        notes: data.notes || null,
        submitterId: userId,
        submitterName: data.submitterName || null,
        // New operational fields
        datesOpen: data.datesOpen || null,
        contactEmail: data.contactEmail || null,
        ownership: data.ownership ? (data.ownership as Ownership) : null,
        permitRequired: data.permitRequired ?? null,
        permitType: data.permitType || null,
        membershipRequired: data.membershipRequired ?? null,
        maxVehicleWidthInches: data.maxVehicleWidthInches || null,
        flagsRequired: data.flagsRequired ?? null,
        sparkArrestorRequired: data.sparkArrestorRequired ?? null,
        helmetsRequired: data.helmetsRequired ?? null,
        noiseLimitDBA: data.noiseLimitDBA || null,
        // Admin submissions are auto-approved
        status: (isAdmin ? "APPROVED" : "PENDING") as ParkStatus,
        terrain: {
          create: data.terrain.map((t) => ({
            terrain: t as Terrain,
          })),
        },
        amenities: {
          create: data.amenities.map((a) => ({
            amenity: a as Amenity,
          })),
        },
        camping: {
          create: (data.camping || []).map((c) => ({
            camping: c as Camping,
          })),
        },
        vehicleTypes: {
          create: (data.vehicleTypes || []).map((v) => ({
            vehicleType: v as VehicleType,
          })),
        },
        // Create address (state is required)
        address: {
          create: {
            streetAddress: data.address.streetAddress || null,
            streetAddress2: data.address.streetAddress2 || null,
            city: data.address.city || null,
            state: data.address.state, // Required
            zipCode: data.address.zipCode || null,
            county: data.address.county || null,
            latitude: data.address.latitude || null,
            longitude: data.address.longitude || null,
          },
        },
      },
      include: {
        terrain: true,
        amenities: true,
        camping: true,
        vehicleTypes: true,
        address: true,
      },
    };

    const { park, claim } = await prisma.$transaction(async (tx) => {
      const createdPark = await tx.park.create(parkCreateArgs);

      let createdClaim = null;
      if (data.claim) {
        createdClaim = await tx.parkClaim.create({
          data: {
            parkId: createdPark.id,
            userId,
            claimantName: data.claim.claimantName.trim(),
            claimantEmail: data.claim.claimantEmail.trim(),
            claimantPhone: data.claim.claimantPhone?.trim() || null,
            businessName: data.claim.businessName?.trim() || null,
            message: data.claim.message?.trim() || null,
            // status defaults to PENDING — admin review required, even
            // for admin submissions where the park itself auto-approves.
          },
          select: {
            id: true,
            status: true,
            claimantName: true,
            claimantEmail: true,
            businessName: true,
            createdAt: true,
          },
        });
      }

      return { park: createdPark, claim: createdClaim };
    });

    // Trigger map-hero generation in the background (OP-90). Doesn't block
    // the response; errors are logged, and the card falls back to live
    // Mapbox if this fails.
    generateMapHeroAsync(park.id, "park-submit");

    return NextResponse.json({ success: true, park, claim });
  } catch (error) {
    console.error("Park submission error:", error);
    return NextResponse.json(
      { error: "Failed to create park" },
      { status: 500 },
    );
  }
}
