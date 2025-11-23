import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ALL_TERRAIN_TYPES,
  ALL_AMENITIES,
  ALL_CAMPING_TYPES,
  ALL_VEHICLE_TYPES,
  ALL_OWNERSHIP_TYPES,
  US_STATES,
} from "@/lib/constants";
import type {
  Terrain,
  Amenity,
  Camping,
  VehicleType,
  Ownership,
} from "@/lib/types";

interface BulkParkInput {
  name: string;
  slug?: string;
  latitude?: number | null;
  longitude?: number | null;
  website?: string;
  phone?: string;
  campingWebsite?: string;
  campingPhone?: string;
  dayPassUSD?: number | null;
  milesOfTrails?: number | null;
  acres?: number | null;
  notes?: string;
  terrain: string[];
  amenities?: string[];
  camping?: string[];
  vehicleTypes?: string[];
  // New scalar fields
  datesOpen?: string;
  contactEmail?: string;
  ownership?: string;
  permitRequired?: boolean;
  permitType?: string;
  membershipRequired?: boolean;
  maxVehicleWidthInches?: number | null;
  flagsRequired?: boolean;
  sparkArrestorRequired?: boolean;
  noiseLimitDBA?: number | null;
  // Address fields (flat in CSV/JSON) - state is required
  streetAddress?: string;
  streetAddress2?: string;
  city?: string;
  state: string;
  zipCode?: string;
  county?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface BulkUploadResult {
  success: boolean;
  created: number;
  errors: ValidationError[];
}

/**
 * Validates a single park entry
 */
function validateParkEntry(
  park: Partial<BulkParkInput>,
  rowIndex: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required fields
  if (!park.name || park.name.trim().length === 0) {
    errors.push({
      row: rowIndex,
      field: "name",
      message: "Park name is required",
    });
  } else if (park.name.length > 100) {
    errors.push({
      row: rowIndex,
      field: "name",
      message: "Park name must be 100 characters or less",
    });
  }

  if (!park.state || park.state.trim().length === 0) {
    errors.push({
      row: rowIndex,
      field: "state",
      message: "State is required",
    });
  } else if (!US_STATES.includes(park.state)) {
    errors.push({
      row: rowIndex,
      field: "state",
      message: `Invalid state. Must be one of: ${US_STATES.join(", ")}`,
    });
  }

  // Terrain validation
  if (!park.terrain || park.terrain.length === 0) {
    errors.push({
      row: rowIndex,
      field: "terrain",
      message: "At least one terrain type is required",
    });
  } else {
    const invalidTerrain = park.terrain.filter(
      (t) => !ALL_TERRAIN_TYPES.includes(t as Terrain)
    );
    if (invalidTerrain.length > 0) {
      errors.push({
        row: rowIndex,
        field: "terrain",
        message: `Invalid terrain types: ${invalidTerrain.join(", ")}. Valid options: ${ALL_TERRAIN_TYPES.join(", ")}`,
      });
    }
  }

  // Amenities validation (optional)
  if (park.amenities && park.amenities.length > 0) {
    const invalidAmenities = park.amenities.filter(
      (a) => !ALL_AMENITIES.includes(a as Amenity)
    );
    if (invalidAmenities.length > 0) {
      errors.push({
        row: rowIndex,
        field: "amenities",
        message: `Invalid amenities: ${invalidAmenities.join(", ")}. Valid options: ${ALL_AMENITIES.join(", ")}`,
      });
    }
  }

  // Camping validation (optional)
  if (park.camping && park.camping.length > 0) {
    const invalidCamping = park.camping.filter(
      (c) => !ALL_CAMPING_TYPES.includes(c as Camping)
    );
    if (invalidCamping.length > 0) {
      errors.push({
        row: rowIndex,
        field: "camping",
        message: `Invalid camping types: ${invalidCamping.join(", ")}. Valid options: ${ALL_CAMPING_TYPES.join(", ")}`,
      });
    }
  }

  // Vehicle types validation (optional)
  if (park.vehicleTypes && park.vehicleTypes.length > 0) {
    const invalidVehicleTypes = park.vehicleTypes.filter(
      (v) => !ALL_VEHICLE_TYPES.includes(v as VehicleType)
    );
    if (invalidVehicleTypes.length > 0) {
      errors.push({
        row: rowIndex,
        field: "vehicleTypes",
        message: `Invalid vehicle types: ${invalidVehicleTypes.join(", ")}. Valid options: ${ALL_VEHICLE_TYPES.join(", ")}`,
      });
    }
  }

  // Notes length validation
  if (park.notes && park.notes.length > 2000) {
    errors.push({
      row: rowIndex,
      field: "notes",
      message: "Notes must be 2000 characters or less",
    });
  }

  // Website URL validation
  if (park.website && park.website.trim().length > 0) {
    try {
      new URL(park.website);
    } catch {
      errors.push({
        row: rowIndex,
        field: "website",
        message: "Invalid website URL format",
      });
    }
  }

  // Phone validation (should be digits only)
  if (park.phone && park.phone.trim().length > 0) {
    const digitsOnly = park.phone.replace(/\D/g, "");
    if (digitsOnly.length > 15) {
      errors.push({
        row: rowIndex,
        field: "phone",
        message: "Phone number must be 15 digits or less",
      });
    }
  }

  // Coordinate validation
  if (park.latitude !== undefined && park.latitude !== null) {
    if (park.latitude < -90 || park.latitude > 90) {
      errors.push({
        row: rowIndex,
        field: "latitude",
        message: "Latitude must be between -90 and 90",
      });
    }
  }

  if (park.longitude !== undefined && park.longitude !== null) {
    if (park.longitude < -180 || park.longitude > 180) {
      errors.push({
        row: rowIndex,
        field: "longitude",
        message: "Longitude must be between -180 and 180",
      });
    }
  }

  // Numeric field validations
  if (
    park.dayPassUSD !== undefined &&
    park.dayPassUSD !== null &&
    park.dayPassUSD < 0
  ) {
    errors.push({
      row: rowIndex,
      field: "dayPassUSD",
      message: "Day pass price cannot be negative",
    });
  }

  if (
    park.milesOfTrails !== undefined &&
    park.milesOfTrails !== null &&
    park.milesOfTrails < 0
  ) {
    errors.push({
      row: rowIndex,
      field: "milesOfTrails",
      message: "Miles of trails cannot be negative",
    });
  }

  if (park.acres !== undefined && park.acres !== null && park.acres < 0) {
    errors.push({
      row: rowIndex,
      field: "acres",
      message: "Acres cannot be negative",
    });
  }

  // Ownership validation
  if (park.ownership && park.ownership.trim().length > 0) {
    if (!ALL_OWNERSHIP_TYPES.includes(park.ownership as Ownership)) {
      errors.push({
        row: rowIndex,
        field: "ownership",
        message: `Invalid ownership type. Valid options: ${ALL_OWNERSHIP_TYPES.join(", ")}`,
      });
    }
  }

  // Contact email validation
  if (park.contactEmail && park.contactEmail.trim().length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(park.contactEmail)) {
      errors.push({
        row: rowIndex,
        field: "contactEmail",
        message: "Invalid email format",
      });
    }
  }

  // maxVehicleWidthInches validation (non-negative)
  if (
    park.maxVehicleWidthInches !== undefined &&
    park.maxVehicleWidthInches !== null &&
    park.maxVehicleWidthInches < 0
  ) {
    errors.push({
      row: rowIndex,
      field: "maxVehicleWidthInches",
      message: "Max vehicle width cannot be negative",
    });
  }

  // noiseLimitDBA validation (non-negative)
  if (
    park.noiseLimitDBA !== undefined &&
    park.noiseLimitDBA !== null &&
    park.noiseLimitDBA < 0
  ) {
    errors.push({
      row: rowIndex,
      field: "noiseLimitDBA",
      message: "Noise limit cannot be negative",
    });
  }

  return errors;
}

/**
 * Generates a unique slug for a park name
 */
async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  let slug = baseSlug;
  let counter = 1;

  // Check for uniqueness and add counter if needed
  while (await prisma.park.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * POST /api/admin/parks/bulk-upload
 * Bulk upload parks from CSV or JSON
 */
export async function POST(
  request: Request
): Promise<NextResponse<BulkUploadResult>> {
  try {
    // Check authentication and admin role
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, created: 0, errors: [] },
        { status: 401 }
      );
    }

    const userRole = (session.user as { role?: string })?.role;
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        { success: false, created: 0, errors: [] },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const parks: Partial<BulkParkInput>[] = body.parks;

    if (!Array.isArray(parks) || parks.length === 0) {
      return NextResponse.json(
        {
          success: false,
          created: 0,
          errors: [
            {
              row: 0,
              field: "parks",
              message: "No parks provided or invalid format",
            },
          ],
        },
        { status: 400 }
      );
    }

    // Validate all parks first
    const allErrors: ValidationError[] = [];
    parks.forEach((park, index) => {
      const parkErrors = validateParkEntry(park, index + 1);
      allErrors.push(...parkErrors);
    });

    // If there are validation errors, return them without creating any parks
    if (allErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          created: 0,
          errors: allErrors,
        },
        { status: 400 }
      );
    }

    // All validation passed - proceed with bulk creation
    const createdParks: string[] = [];

    // Use transaction for data integrity
    await prisma.$transaction(async (tx) => {
      for (const park of parks as BulkParkInput[]) {
        // Generate slug if not provided
        const slug = park.slug
          ? park.slug
          : await generateUniqueSlug(park.name);

        // Sanitize phone numbers (remove non-digits)
        const sanitizedPhone = park.phone
          ? park.phone.replace(/\D/g, "")
          : undefined;
        const sanitizedCampingPhone = park.campingPhone
          ? park.campingPhone.replace(/\D/g, "")
          : undefined;

        // Create park
        const createdPark = await tx.park.create({
          data: {
            name: park.name,
            slug,
            latitude: park.latitude ?? null,
            longitude: park.longitude ?? null,
            website: park.website || null,
            phone: sanitizedPhone || null,
            campingWebsite: park.campingWebsite || null,
            campingPhone: sanitizedCampingPhone || null,
            dayPassUSD: park.dayPassUSD ?? null,
            milesOfTrails: park.milesOfTrails ?? null,
            acres: park.acres ?? null,
            notes: park.notes || null,
            status: "APPROVED", // Admin bulk uploads are pre-approved
            submitterId: session.user?.id || "",
            // New scalar fields
            datesOpen: park.datesOpen || null,
            contactEmail: park.contactEmail || null,
            ownership: (park.ownership as Ownership) || null,
            permitRequired: park.permitRequired ?? null,
            permitType: park.permitType || null,
            membershipRequired: park.membershipRequired ?? null,
            maxVehicleWidthInches: park.maxVehicleWidthInches ?? null,
            flagsRequired: park.flagsRequired ?? null,
            sparkArrestorRequired: park.sparkArrestorRequired ?? null,
            noiseLimitDBA: park.noiseLimitDBA ?? null,
          },
        });

        // Create Address record (state is required)
        await tx.address.create({
          data: {
            parkId: createdPark.id,
            streetAddress: park.streetAddress || null,
            streetAddress2: park.streetAddress2 || null,
            city: park.city || null,
            state: park.state, // Required
            zipCode: park.zipCode || null,
            county: park.county || null,
            latitude: park.latitude ?? null,
            longitude: park.longitude ?? null,
          },
        });

        // Create terrain relations
        await Promise.all(
          park.terrain.map((terrainType) =>
            tx.parkTerrain.create({
              data: {
                parkId: createdPark.id,
                terrain: terrainType as Terrain,
              },
            })
          )
        );

        // Create amenity relations (if provided)
        if (park.amenities && park.amenities.length > 0) {
          await Promise.all(
            park.amenities.map((amenity) =>
              tx.parkAmenity.create({
                data: {
                  parkId: createdPark.id,
                  amenity: amenity as Amenity,
                },
              })
            )
          );
        }

        // Create camping relations (if provided)
        if (park.camping && park.camping.length > 0) {
          await Promise.all(
            park.camping.map((campingType) =>
              tx.parkCamping.create({
                data: {
                  parkId: createdPark.id,
                  camping: campingType as Camping,
                },
              })
            )
          );
        }

        // Create vehicle type relations (if provided)
        if (park.vehicleTypes && park.vehicleTypes.length > 0) {
          await Promise.all(
            park.vehicleTypes.map((vehicleType) =>
              tx.parkVehicleType.create({
                data: {
                  parkId: createdPark.id,
                  vehicleType: vehicleType as VehicleType,
                },
              })
            )
          );
        }

        createdParks.push(createdPark.id);
      }
    });

    return NextResponse.json({
      success: true,
      created: createdParks.length,
      errors: [],
    });
  } catch (error) {
    console.error("Bulk upload error:", error);
    return NextResponse.json(
      {
        success: false,
        created: 0,
        errors: [
          {
            row: 0,
            field: "system",
            message:
              error instanceof Error
                ? error.message
                : "An unexpected error occurred",
          },
        ],
      },
      { status: 500 }
    );
  }
}
