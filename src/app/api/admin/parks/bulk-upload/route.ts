import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ALL_TERRAIN_TYPES, ALL_AMENITIES, US_STATES } from "@/lib/constants";
import type { Terrain, Difficulty, Amenity } from "@/lib/types";

// Difficulty levels array
const ALL_DIFFICULTY_LEVELS: Difficulty[] = [
  "easy",
  "moderate",
  "difficult",
  "extreme",
];

interface BulkParkInput {
  name: string;
  slug?: string;
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
  utvAllowed?: boolean;
  terrain: string[];
  difficulty: string[];
  amenities?: string[];
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

  // Difficulty validation
  if (!park.difficulty || park.difficulty.length === 0) {
    errors.push({
      row: rowIndex,
      field: "difficulty",
      message: "At least one difficulty level is required",
    });
  } else {
    const invalidDifficulty = park.difficulty.filter(
      (d) => !ALL_DIFFICULTY_LEVELS.includes(d as Difficulty)
    );
    if (invalidDifficulty.length > 0) {
      errors.push({
        row: rowIndex,
        field: "difficulty",
        message: `Invalid difficulty levels: ${invalidDifficulty.join(", ")}. Valid options: ${ALL_DIFFICULTY_LEVELS.join(", ")}`,
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

        // Sanitize phone (remove non-digits)
        const sanitizedPhone = park.phone
          ? park.phone.replace(/\D/g, "")
          : undefined;

        // Create park
        const createdPark = await tx.park.create({
          data: {
            name: park.name,
            slug,
            city: park.city || null,
            state: park.state,
            latitude: park.latitude ?? null,
            longitude: park.longitude ?? null,
            website: park.website || null,
            phone: sanitizedPhone || null,
            dayPassUSD: park.dayPassUSD ?? null,
            milesOfTrails: park.milesOfTrails ?? null,
            acres: park.acres ?? null,
            notes: park.notes || null,
            utvAllowed: park.utvAllowed ?? true,
            status: "APPROVED", // Admin bulk uploads are pre-approved
            submitterId: session.user?.id || "",
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

        // Create difficulty relations
        await Promise.all(
          park.difficulty.map((difficultyLevel) =>
            tx.parkDifficulty.create({
              data: {
                parkId: createdPark.id,
                difficulty: difficultyLevel as Difficulty,
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
