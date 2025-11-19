# Park Data Model Reference Guide

**Purpose:** This document provides a complete reference for understanding and extending the park data model in the Offroad Parks application. Use this guide when adding new amenities, terrain types, difficulty levels, or entirely new categorical fields.

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Complete Data Architecture](#complete-data-architecture)
3. [How to Add New Values](#how-to-add-new-values)
4. [How to Add New Categories](#how-to-add-new-categories)
5. [Bulk Upload Implementation](#bulk-upload-implementation)
6. [Architecture Rules](#architecture-rules)
7. [Common Pitfalls](#common-pitfalls)

---

## Quick Reference

### Current Categorical Values

**Terrain Types** (`Terrain` enum)
```typescript
"sand" | "rocks" | "mud" | "trails" | "hills"
```

**Difficulty Levels** (`Difficulty` enum)
```typescript
"easy" | "moderate" | "difficult" | "extreme"
```

**Amenities** (`Amenity` enum)
```typescript
"restrooms" | "showers" | "food" | "fuel" | "repair"
```

**Camping** (`Camping` enum)
```typescript
"tent" | "rv30A" | "rv50A" | "fullHookup" | "cabin" | "groupSite" | "backcountry"
```

**Park Status** (`ParkStatus` enum)
```typescript
"PENDING" | "APPROVED" | "REJECTED" | "DRAFT"
```

### File Locations (3-Layer Update Pattern)

| Layer | File Path | What to Update |
|-------|-----------|----------------|
| **Database Schema** | `prisma/schema.prisma` | Enum definitions + Junction table models |
| **TypeScript Types** | `src/lib/types.ts` | Type aliases + DbPark + Park interfaces |
| **Constants** | `src/lib/constants.ts` | Array constants for UI components |
| **Transformer** | `src/lib/types.ts` | `transformDbPark()` function |
| **API Queries** | `src/app/api/**/route.ts` | Prisma `include` clauses |
| **Bulk Upload** | `src/app/api/admin/parks/bulk-upload/route.ts` | Validation logic + constants |
| **Forms** | `src/components/forms/ParkSubmissionForm.tsx` | Form checkboxes (shared for create/edit) |
| **Admin Edit Page** | `src/app/admin/parks/[id]/edit/page.tsx` | Data transformation for form |
| **Admin Edit API** | `src/app/api/admin/parks/[id]/route.ts` | PATCH handler with junction table updates |
| **Filters** | `src/components/parks/SearchFiltersPanel.tsx` | Filter dropdowns |
| **Display** | `src/components/shared/ParkBadges.tsx` | Badge components |

---

## Complete Data Architecture

### Core Park Model

The `Park` model has two representations:

#### Database Format (DbPark)
```typescript
type DbPark = {
  // Scalar fields
  id: string;              // CUID (e.g., "clx123abc")
  slug: string;            // URL-friendly (e.g., "silver-lake-sand-dunes")
  name: string;
  city: string | null;
  state: string;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  phone: string | null;
  campingWebsite: string | null;  // Separate camping reservations website
  campingPhone: string | null;    // Separate camping reservations phone
  dayPassUSD: number | null;
  milesOfTrails: number | null;
  acres: number | null;
  notes: string | null;
  status: ParkStatus;

  // Junction table relations (array of objects)
  terrain: Array<{ terrain: Terrain }>;
  difficulty: Array<{ difficulty: Difficulty }>;
  amenities: Array<{ amenity: Amenity }>;
  camping: Array<{ camping: Camping }>;
};
```

#### Client Format (Park)
```typescript
type Park = {
  // Scalar fields
  id: string;              // Stores slug (not DB id!)
  name: string;
  city?: string;
  state: string;
  website?: string;
  phone?: string;
  campingWebsite?: string; // Separate camping reservations website
  campingPhone?: string;   // Separate camping reservations phone
  coords?: { lat: number; lng: number };  // Restructured from lat/lng
  dayPassUSD?: number;
  milesOfTrails?: number;
  acres?: number;
  notes?: string;

  // Categorical data (flattened to simple arrays)
  terrain: Terrain[];      // ["sand", "rocks"]
  difficulty: Difficulty[]; // ["moderate", "difficult"]
  amenities: Amenity[];    // ["restrooms", "fuel"]
  camping: Camping[];      // ["tent", "rv30A"]

  heroImage?: string | null;
};
```

### Junction Table Pattern

Categorical data uses **many-to-many relationships** via junction tables:

```prisma
// prisma/schema.prisma

model ParkTerrain {
  id      String  @id @default(cuid())
  parkId  String
  terrain Terrain

  park Park @relation(fields: [parkId], references: [id], onDelete: Cascade)

  @@unique([parkId, terrain])  // Prevents duplicate entries
}

model ParkDifficulty {
  id         String     @id @default(cuid())
  parkId     String
  difficulty Difficulty

  park Park @relation(fields: [parkId], references: [id], onDelete: Cascade)

  @@unique([parkId, difficulty])
}

model ParkAmenity {
  id      String  @id @default(cuid())
  parkId  String
  amenity Amenity

  park Park @relation(fields: [parkId], references: [id], onDelete: Cascade)

  @@unique([parkId, amenity])
}
```

**Why Junction Tables?**
- Parks can have multiple values per category (e.g., "sand" + "rocks")
- Database enforces uniqueness (can't add "sand" twice)
- Cascading deletes automatically clean up orphaned records
- Easy to query: "Find all parks with X amenity"

### Data Transformation Flow

```
┌─────────────────┐
│   DATABASE      │  Junction tables: [{terrain: "sand"}, {terrain: "rocks"}]
│   (Prisma)      │
└────────┬────────┘
         │ include: { terrain: true, difficulty: true, amenities: true }
         ↓
┌─────────────────┐
│   API ROUTE     │  Raw Prisma result with nested objects
│   (route.ts)    │
└────────┬────────┘
         │ transformDbPark()
         ↓
┌─────────────────┐
│   CLIENT        │  Flattened arrays: ["sand", "rocks"]
│   (Park type)   │
└────────┬────────┘
         │ map, filter, display
         ↓
┌─────────────────┐
│   UI            │  Badges, filters, forms
│   (components)  │
└─────────────────┘
```

---

## How to Add New Values

### Adding to Existing Categories

**Example:** Adding `"proShop"` to amenities or `"gravel"` to terrain types

#### ✅ Step 1: Update Prisma Schema
**File:** `prisma/schema.prisma`

```prisma
enum Amenity {
  camping
  cabins
  restrooms
  showers
  food
  fuel
  repair
  proShop    // ← Add new value (use camelCase)
}
```

#### ✅ Step 2: Update TypeScript Type
**File:** `src/lib/types.ts`

```typescript
export type Amenity =
  | "camping"
  | "cabins"
  | "restrooms"
  | "showers"
  | "food"
  | "fuel"
  | "repair"
  | "proShop";  // ← Add new value
```

#### ✅ Step 3: Update Constants Array
**File:** `src/lib/constants.ts`

```typescript
export const ALL_AMENITIES: Amenity[] = [
  "camping",
  "cabins",
  "restrooms",
  "showers",
  "food",
  "fuel",
  "repair",
  "proShop",  // ← Add new value
];
```

#### ✅ Step 4: Update Bulk Upload Validation (if applicable)
**File:** `src/app/api/admin/parks/bulk-upload/route.ts`

If the constant doesn't exist yet in bulk upload, add it:
```typescript
// Add constant if not imported
import { ALL_AMENITIES, ALL_TERRAIN_TYPES } from "@/lib/constants";

// For new categories, add local constant at top of file
const ALL_DIFFICULTY_LEVELS: Difficulty[] = [
  "easy",
  "moderate",
  "difficult",
  "extreme",
  "waterfalls",  // ← New value automatically included
];
```

**Note:** Bulk upload uses the same constants - no validation changes needed when adding values to existing categories!

### ✅ Step 5: Push Database Changes
```bash
npm run db:push  # Pushes schema to PostgreSQL
```

#### ✅ Step 6: Verify UI Updates
The new value will automatically appear in:
- ✅ Park submission form checkboxes
- ✅ Search filter dropdowns
- ✅ Park badges (capitalized display)
- ✅ Bulk upload validation (via shared constants)

**No additional code changes needed** - the UI components iterate over constants arrays.

---

## How to Add New Categories

### Adding Entirely New Categorical Fields

**Example:** Adding "Vehicle Types" to track what vehicles are allowed

#### ✅ Step 1: Create Enum in Prisma Schema
**File:** `prisma/schema.prisma`

```prisma
enum VehicleType {
  utv
  atv
  dirtBike
  fourByFour
  sxs
}

model ParkVehicleType {
  id          String      @id @default(cuid())
  parkId      String
  vehicleType VehicleType

  park Park @relation(fields: [parkId], references: [id], onDelete: Cascade)

  @@unique([parkId, vehicleType])
}
```

#### ✅ Step 2: Add Relation to Park Model
**File:** `prisma/schema.prisma`

```prisma
model Park {
  id            String     @id @default(cuid())
  name          String
  // ... other fields

  terrain       ParkTerrain[]
  difficulty    ParkDifficulty[]
  amenities     ParkAmenity[]
  vehicleTypes  ParkVehicleType[]  // ← Add new relation

  // ... other relations
}
```

#### ✅ Step 3: Create TypeScript Type
**File:** `src/lib/types.ts`

```typescript
// Add new type alias
export type VehicleType = "utv" | "atv" | "dirtBike" | "fourByFour" | "sxs";

// Update DbPark to include new field
export type DbPark = {
  // ... existing fields
  terrain: Array<{ terrain: Terrain }>;
  difficulty: Array<{ difficulty: Difficulty }>;
  amenities: Array<{ amenity: Amenity }>;
  vehicleTypes: Array<{ vehicleType: VehicleType }>;  // ← Add here
};

// Update Park client type
export type Park = {
  // ... existing fields
  terrain: Terrain[];
  difficulty: Difficulty[];
  amenities: Amenity[];
  vehicleTypes: VehicleType[];  // ← Add here
};
```

#### ✅ Step 4: Create Constants
**File:** `src/lib/constants.ts`

```typescript
export const ALL_VEHICLE_TYPES: VehicleType[] = [
  "utv",
  "atv",
  "dirtBike",
  "fourByFour",
  "sxs",
];
```

#### ✅ Step 5: Update Transformer
**File:** `src/lib/types.ts`

```typescript
export function transformDbPark(dbPark: DbPark): Park {
  return {
    id: dbPark.slug,
    name: dbPark.name,
    // ... other transformations
    terrain: dbPark.terrain.map((t) => t.terrain),
    difficulty: dbPark.difficulty.map((d) => d.difficulty),
    amenities: dbPark.amenities.map((a) => a.amenity),
    vehicleTypes: dbPark.vehicleTypes.map((v) => v.vehicleType),  // ← Add here
  };
}
```

#### ✅ Step 6: Update ALL API Queries
**Files:** `src/app/api/parks/route.ts`, `src/app/api/parks/[slug]/route.ts`, etc.

```typescript
const parks = await prisma.park.findMany({
  where: { status: "APPROVED" },
  include: {
    terrain: true,
    difficulty: true,
    amenities: true,
    vehicleTypes: true,  // ← Add to all queries
  },
});
```

**Critical:** Every API route that fetches parks must include the new relation!

#### ✅ Step 7: Update Park Creation/Updates
**Files:** `src/app/api/parks/submit/route.ts`, `src/app/api/admin/parks/[id]/route.ts`

**For creating parks:**
```typescript
const park = await prisma.park.create({
  data: {
    name: data.name,
    // ... other fields
    terrain: {
      create: data.terrain.map((t) => ({ terrain: t as Terrain })),
    },
    vehicleTypes: {  // ← Add here
      create: data.vehicleTypes.map((v) => ({ vehicleType: v as VehicleType })),
    },
  },
});
```

**For updating parks:**
```typescript
const park = await prisma.park.update({
  where: { id },
  data: {
    // ... other fields
    terrain: {
      deleteMany: {},
      create: terrain?.map((t: string) => ({ terrain: t })) || [],
    },
    vehicleTypes: {  // ← Add here
      deleteMany: {},
      create: vehicleTypes?.map((v: string) => ({ vehicleType: v })) || [],
    },
  },
});
```

#### ✅ Step 8: Update UI Components

**Park Submission Form** (`src/components/forms/ParkSubmissionForm.tsx`)
```typescript
// Add state
const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);

// Add checkboxes section
<div className="space-y-2">
  <Label>Vehicle Types</Label>
  <div className="grid grid-cols-2 gap-2">
    {ALL_VEHICLE_TYPES.map((type) => (
      <div key={type} className="flex items-center space-x-2">
        <Checkbox
          id={`vehicle-${type}`}
          checked={vehicleTypes.includes(type)}
          onCheckedChange={(checked) => {
            setVehicleTypes(
              checked
                ? [...vehicleTypes, type]
                : vehicleTypes.filter((t) => t !== type)
            );
          }}
        />
        <label htmlFor={`vehicle-${type}`} className="capitalize">
          {type}
        </label>
      </div>
    ))}
  </div>
</div>
```

**Search Filters Panel** (`src/components/parks/SearchFiltersPanel.tsx`)
```typescript
// Add to filter state and UI
<Select value={selectedVehicleType} onValueChange={setSelectedVehicleType}>
  <SelectTrigger>
    <SelectValue placeholder="Vehicle Type" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Vehicle Types</SelectItem>
    {ALL_VEHICLE_TYPES.map((type) => (
      <SelectItem key={type} value={type} className="capitalize">
        {type}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

**Park Badges** (`src/components/shared/ParkBadges.tsx`)
```typescript
export function VehicleTypeBadges({ vehicleTypes }: { vehicleTypes: VehicleType[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {vehicleTypes.map((type) => (
        <Badge key={type} variant="outline" className="capitalize">
          {type}
        </Badge>
      ))}
    </div>
  );
}
```

**Filter Hook** (`src/hooks/useFilteredParks.ts`)
```typescript
// Add filter logic
if (selectedVehicleType) {
  filteredList = filteredList.filter((park) =>
    park.vehicleTypes.includes(selectedVehicleType as VehicleType)
  );
}
```

#### ✅ Step 9: Update Admin Edit API
**File:** `src/app/api/admin/parks/[id]/route.ts`

Add junction table updates for the new category:
```typescript
// In PATCH handler, add to park.update data
await prisma.park.update({
  where: { id },
  data: {
    // ... existing updates
    terrain: {
      deleteMany: {},
      create: terrain?.map((t: string) => ({ terrain: t })) || [],
    },
    vehicleTypes: {  // ← Add new category
      deleteMany: {},
      create: vehicleTypes?.map((v: string) => ({ vehicleType: v })) || [],
    },
  },
});
```

**File:** `src/app/admin/parks/[id]/edit/page.tsx`

Add transformation for edit page form:
```typescript
const initialData = {
  // ... existing fields
  terrain: park.terrain.map((t) => t.terrain),
  difficulty: park.difficulty.map((d) => d.difficulty),
  amenities: park.amenities.map((a) => a.amenity),
  vehicleTypes: park.vehicleTypes.map((v) => v.vehicleType),  // ← Add here
};
```

**Note:** Since `ParkSubmissionForm` is reused for both create and edit, form updates (Step 7) automatically apply to admin edit!

#### ✅ Step 10: Push Database Changes
```bash
npm run db:push
```

#### ✅ Step 11: Update Bulk Upload
**File:** `src/app/api/admin/parks/bulk-upload/route.ts`

Add validation for the new category:
```typescript
// Add to BulkParkInput interface
interface BulkParkInput {
  // ... existing fields
  terrain: string[];
  difficulty: string[];
  amenities?: string[];
  vehicleTypes?: string[];  // ← Add new category
}

// Add validation in validateParkEntry function
if (park.vehicleTypes && park.vehicleTypes.length > 0) {
  const invalidTypes = park.vehicleTypes.filter(
    (v) => !ALL_VEHICLE_TYPES.includes(v as VehicleType)
  );
  if (invalidTypes.length > 0) {
    errors.push({
      row: rowIndex,
      field: "vehicleTypes",
      message: `Invalid vehicle types: ${invalidTypes.join(", ")}. Valid options: ${ALL_VEHICLE_TYPES.join(", ")}`,
    });
  }
}

// Add junction table creation in transaction
if (park.vehicleTypes && park.vehicleTypes.length > 0) {
  await Promise.all(
    park.vehicleTypes.map((type) =>
      tx.parkVehicleType.create({
        data: {
          parkId: createdPark.id,
          vehicleType: type as VehicleType,
        },
      })
    )
  );
}
```

#### ✅ Step 12: Test Critical Paths
```bash
npx vitest run test/app/api/parks/submit/route.test.ts
npx vitest run test/app/api/admin/parks/[id]/route.test.ts  # Admin edit API
npx vitest run test/app/api/admin/parks/bulk-upload/route.test.ts
npx vitest run test/hooks/useFilteredParks.test.ts
```

---

## Bulk Upload Implementation

### Overview

The bulk upload endpoint (`/api/admin/parks/bulk-upload`) allows admins to create multiple parks at once via CSV or JSON. It follows the same data model patterns but has additional validation and transaction handling.

**File:** `src/app/api/admin/parks/bulk-upload/route.ts`

### Key Features

1. **Pre-validation:** Validates ALL parks before creating any (fail-fast)
2. **Transaction:** Uses `prisma.$transaction()` for atomicity (all-or-nothing)
3. **Detailed Errors:** Returns row number + field + message for each error
4. **Auto-approval:** Admin uploads are automatically `APPROVED`
5. **Slug Generation:** Auto-generates unique slugs if not provided

### Validation Pattern

```typescript
function validateParkEntry(park: Partial<BulkParkInput>, rowIndex: number): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate terrain (required)
  if (!park.terrain || park.terrain.length === 0) {
    errors.push({
      row: rowIndex,
      field: "terrain",
      message: "At least one terrain type is required",
    });
  } else {
    // Check against constants
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

  // Same pattern for difficulty, amenities, etc.
  return errors;
}
```

### Constants Used in Validation

**Imported from `lib/constants.ts`:**
- `ALL_TERRAIN_TYPES` - Validates terrain values
- `ALL_AMENITIES` - Validates amenity values
- `US_STATES` - Validates state names

**Defined locally:**
```typescript
const ALL_DIFFICULTY_LEVELS: Difficulty[] = [
  "easy",
  "moderate",
  "difficult",
  "extreme",
];
```

**Note:** When you add values to existing categories, bulk upload automatically picks them up via shared constants!

### Adding New Categories to Bulk Upload

When adding a new category (e.g., VehicleType), you must:

1. **Update `BulkParkInput` interface** to include new field
2. **Add validation logic** in `validateParkEntry()` function
3. **Add junction table creation** in the transaction loop
4. **Import/define constants** for validation

**Example for VehicleType:**

```typescript
// 1. Update interface
interface BulkParkInput {
  // ... existing fields
  vehicleTypes?: string[];  // Optional categorical field
}

// 2. Add validation
if (park.vehicleTypes && park.vehicleTypes.length > 0) {
  const invalidTypes = park.vehicleTypes.filter(
    (v) => !ALL_VEHICLE_TYPES.includes(v as VehicleType)
  );
  if (invalidTypes.length > 0) {
    errors.push({
      row: rowIndex,
      field: "vehicleTypes",
      message: `Invalid vehicle types: ${invalidTypes.join(", ")}. Valid options: ${ALL_VEHICLE_TYPES.join(", ")}`,
    });
  }
}

// 3. Add to transaction (after creating park)
if (park.vehicleTypes && park.vehicleTypes.length > 0) {
  await Promise.all(
    park.vehicleTypes.map((type) =>
      tx.parkVehicleType.create({
        data: {
          parkId: createdPark.id,
          vehicleType: type as VehicleType,
        },
      })
    )
  );
}
```

### Input Format

**JSON Request Body:**
```json
{
  "parks": [
    {
      "name": "Silver Lake Sand Dunes",
      "state": "Michigan",
      "city": "Mears",
      "terrain": ["sand", "hills"],
      "difficulty": ["moderate", "difficult"],
      "amenities": ["camping", "restrooms"],
      "latitude": 43.6891,
      "longitude": -86.5024,
      "acres": 2000,
      "notes": "Popular destination for sand dune riding"
    }
  ]
}
```

**Response Format:**
```json
{
  "success": true,
  "created": 1,
  "errors": []
}
```

**Error Response:**
```json
{
  "success": false,
  "created": 0,
  "errors": [
    {
      "row": 1,
      "field": "terrain",
      "message": "Invalid terrain types: gravel. Valid options: sand, rocks, mud, trails, hills"
    },
    {
      "row": 2,
      "field": "state",
      "message": "State is required"
    }
  ]
}
```

### Testing Bulk Upload

**Test file:** `test/app/api/admin/parks/bulk-upload/route.test.ts`

**Critical test scenarios:**
- ✅ Valid bulk upload creates multiple parks
- ✅ Invalid terrain/difficulty/amenities rejected
- ✅ Transaction rollback on error (no partial creates)
- ✅ Auto-slug generation for duplicate names
- ✅ Admin-only access (401/403 for non-admins)
- ✅ Detailed validation error messages

---

## Architecture Rules

### Type Safety Chain

All categorical data must maintain consistency across **4 layers**:

```
Prisma Schema Enum → TypeScript Type → Constants Array → UI Components
```

**Example for Amenity:**
1. `enum Amenity { camping, cabins, ... }` (Prisma)
2. `type Amenity = "camping" | "cabins" | ...` (TypeScript)
3. `const ALL_AMENITIES: Amenity[] = ["camping", ...]` (Constants)
4. `{ALL_AMENITIES.map(...)}` (UI)

**Breaking this chain causes:**
- ❌ TypeScript compilation errors
- ❌ Runtime errors (enum mismatch)
- ❌ Missing values in UI dropdowns

### Junction Table CRUD Patterns

**Creating Parks** (New Data)
```typescript
await prisma.park.create({
  data: {
    terrain: {
      create: ["sand", "rocks"].map(t => ({ terrain: t }))
    }
  }
});
```

**Updating Parks** (Replace Strategy)
```typescript
await prisma.park.update({
  where: { id },
  data: {
    terrain: {
      deleteMany: {},  // Delete all existing
      create: ["mud"].map(t => ({ terrain: t }))  // Add new
    }
  }
});
```

**Why "deleteMany + create"?**
- Simpler than diffing changes
- Atomic operation (transaction)
- No orphaned records
- Works with Prisma's update API

**Bulk Upload Pattern** (Admin Only)
```typescript
// Uses transaction for atomicity
await prisma.$transaction(async (tx) => {
  for (const park of parks) {
    const createdPark = await tx.park.create({ data: { ...park } });

    // Create terrain relations separately
    await Promise.all(
      park.terrain.map((t) =>
        tx.parkTerrain.create({
          data: { parkId: createdPark.id, terrain: t }
        })
      )
    );

    // Same pattern for difficulty, amenities
  }
});
```

**Why separate creates in bulk upload?**
- Transaction ensures all-or-nothing (atomicity)
- Validates all parks before creating any
- Returns detailed validation errors per row
- More explicit error handling

**Admin Edit Pattern** (Update Existing Parks)
```typescript
// 1. Edit page fetches park with relations
const park = await prisma.park.findUnique({
  where: { id },
  include: { terrain: true, difficulty: true, amenities: true }
});

// 2. Transform for form (junction tables → arrays)
const formData = {
  ...park,
  terrain: park.terrain.map((t) => t.terrain),
  difficulty: park.difficulty.map((d) => d.difficulty),
  amenities: park.amenities.map((a) => a.amenity),
};

// 3. PATCH API recreates junction records
await prisma.park.update({
  where: { id },
  data: {
    ...parkData,
    terrain: {
      deleteMany: {},  // Remove all existing
      create: terrain.map((t) => ({ terrain: t }))  // Recreate
    }
  }
});
```

**Why admin edit uses deleteMany + create?**
- Ensures junction records match form state exactly
- Simpler than computing diffs
- No orphaned records
- Same pattern as regular updates

**Important:** `ParkSubmissionForm` is reused for both create and edit:
- Regular users: POST `/api/parks/submit` (status: PENDING)
- Admin create: POST `/api/parks/submit` (status: APPROVED)
- Admin edit: PATCH `/api/admin/parks/[id]` (preserves status)

### Data Transformation Requirements

**Always use `transformDbPark()` in API routes:**

```typescript
// ❌ BAD: Returns junction table format to client
return Response.json(dbParks);

// ✅ GOOD: Returns flattened arrays
return Response.json(dbParks.map(transformDbPark));
```

**Always include relations in Prisma queries:**

```typescript
// ❌ BAD: Missing terrain data
const park = await prisma.park.findUnique({
  where: { slug }
});

// ✅ GOOD: Includes all categorical data
const park = await prisma.park.findUnique({
  where: { slug },
  include: {
    terrain: true,
    difficulty: true,
    amenities: true,
  }
});
```

### Naming Conventions

**Enum Values** (Prisma Schema)
- Use `camelCase` for multi-word values
- Example: `proShop`, `dirtBike`, `fourByFour`

**Type Aliases** (TypeScript)
- Match Prisma enum exactly (including case)
- Example: `"proShop"` not `"pro-shop"`

**Display Values** (UI)
- Use `capitalize` CSS class for single words
- Use custom formatters for multi-word (e.g., "Pro Shop")

---

## Common Pitfalls

### ❌ Pitfall 1: Forgetting to Include Relations
```typescript
// Missing include causes empty arrays after transformation
const park = await prisma.park.findUnique({ where: { slug } });
const transformed = transformDbPark(park);  // terrain: []
```

**✅ Solution:** Always include relations in queries

### ❌ Pitfall 2: Not Updating All API Routes
```typescript
// Route A includes vehicleTypes
// Route B forgets vehicleTypes
// Result: Data missing in some views
```

**✅ Solution:** Search codebase for all `prisma.park.find` calls

### ❌ Pitfall 3: Type Mismatches Between Layers
```typescript
// Prisma: proShop
// TypeScript: "pro-shop"  ❌ MISMATCH
// Constants: "proShop"
```

**✅ Solution:** Use exact same strings across all layers

### ❌ Pitfall 4: Forgetting Database Migration
```typescript
// Added to TypeScript but not to Prisma schema
// Result: Runtime errors when saving data
```

**✅ Solution:** Always run `npm run db:push` after schema changes

### ❌ Pitfall 5: Not Transforming Data in API Response
```typescript
// API returns: { terrain: [{ terrain: "sand" }] }
// Client expects: { terrain: ["sand"] }
```

**✅ Solution:** Always use `transformDbPark()` before returning

### ❌ Pitfall 6: Unique Constraint Violations
```typescript
// Trying to add "sand" twice to same park
await prisma.parkTerrain.create({
  data: { parkId: "123", terrain: "sand" }  // Already exists!
});
```

**✅ Solution:** Use `deleteMany + create` pattern for updates

### ❌ Pitfall 7: Forgetting Bulk Upload When Adding Categories
```typescript
// Added VehicleType to schema, types, forms, filters
// Forgot to update bulk upload validation
// Result: Bulk uploads fail silently or accept invalid data
```

**✅ Solution:** Always update bulk upload's `BulkParkInput`, validation, and transaction logic when adding new categories

**Note:** Adding values to existing categories (e.g., "waterfalls" to terrain) automatically works in bulk upload via shared constants!

### ❌ Pitfall 8: Forgetting Admin Edit Transformations
```typescript
// Added VehicleType to schema, API, and form
// Forgot to update admin edit page transformation
// Result: Edit page shows empty vehicleTypes, saves incorrectly
```

**✅ Solution:** When adding new categories, update BOTH:
1. `src/app/api/admin/parks/[id]/route.ts` - PATCH handler junction table logic
2. `src/app/admin/parks/[id]/edit/page.tsx` - Form data transformation

**Form reuse bonus:** Since `ParkSubmissionForm` is shared, form UI updates automatically apply to admin edit!

---

## Data Model Change Process: Lessons Learned

### Overview

This section documents the complete process for making significant changes to the data model based on the real-world experience of converting "camping" from a simple amenity to a dedicated category with 7 granular options.

**Use Case:** When an existing categorical value needs to become its own category with more detailed options.

**Example:** Converting "camping" and "cabins" amenities into a dedicated Camping category with: Tent, RV 30A, RV 50A, Full Hookup, Cabin, Group Site, Backcountry/Walk-in.

### Complete Change Workflow

#### Phase 1: Planning & Data Migration (Manual)

**1. Identify the Scope**
- Determine which existing values need to be removed
- Define new category name and all possible values
- Decide on display name formatting requirements
- Plan data migration strategy (manual vs automated)

**Example Decision Log:**
```
- Remove: amenities "camping" and "cabins"
- Add: New "Camping" category
- Values: tent, rv30A, rv50A, fullHookup, cabin, groupSite, backcountry
- Display: "RV 30A", "RV 50A", "Backcountry / Walk-in"
- Migration: Manual (user will update data via Prisma Studio)
```

**2. Handle Existing Data**
Before making schema changes that would cause data loss:

```bash
# Option A: Delete conflicting records via Prisma Studio
# Navigate to ParkAmenity table
# Delete all records where amenity IN ('camping', 'cabins')

# Option B: SQL query (if comfortable)
# DELETE FROM "ParkAmenity" WHERE amenity IN ('camping', 'cabins');

# Option C: Create a Prisma migration script
# npx prisma migrate dev --create-only
# Edit the generated migration SQL to preserve/transform data
```

**Important:** Prisma will warn you about data loss if you try to remove enum values that are in use. You MUST handle the data before pushing schema changes.

#### Phase 2: Schema & Type Updates (8 Layers)

Follow these steps in order to maintain type safety throughout:

**Layer 1: Database Schema** (`prisma/schema.prisma`)

```prisma
// 1. Create new enum
enum Camping {
  tent
  rv30A      // Display as "RV 30A"
  rv50A      // Display as "RV 50A"
  fullHookup
  cabin
  groupSite
  backcountry  // Display as "Backcountry / Walk-in"
}

// 2. Create junction table
model ParkCamping {
  id      String  @id @default(cuid())
  parkId  String
  camping Camping

  park Park @relation(fields: [parkId], references: [id], onDelete: Cascade)

  @@unique([parkId, camping])
}

// 3. Add relation to Park model
model Park {
  // ... existing relations
  camping     ParkCamping[]  // Add here
}

// 4. Remove old values from original enum
enum Amenity {
  restrooms
  showers
  food
  fuel
  repair
  // REMOVED: camping, cabins
}
```

Push changes:
```bash
npm run db:push
```

**Layer 2: TypeScript Types** (`src/lib/types.ts`)

```typescript
// 1. Add new type
export type Camping = "tent" | "rv30A" | "rv50A" | "fullHookup" | "cabin" | "groupSite" | "backcountry";

// 2. Update Amenity type (remove old values)
export type Amenity = "restrooms" | "showers" | "food" | "fuel" | "repair";

// 3. Update DbPark interface
export type DbPark = {
  // ... existing fields
  amenities: Array<{ amenity: Amenity }>;
  camping: Array<{ camping: Camping }>;  // Add here
};

// 4. Update Park interface
export type Park = {
  // ... existing fields
  amenities: Amenity[];
  camping: Camping[];  // Add here
};

// 5. Update transformDbPark function
export function transformDbPark(dbPark: DbPark): Park {
  return {
    // ... existing transformations
    amenities: dbPark.amenities.map((a) => a.amenity),
    camping: dbPark.camping.map((c) => c.camping),  // Add here
  };
}
```

**Layer 3: Constants** (`src/lib/constants.ts`)

```typescript
// 1. Create new constant
export const ALL_CAMPING_TYPES: Camping[] = [
  "tent",
  "rv30A",
  "rv50A",
  "fullHookup",
  "cabin",
  "groupSite",
  "backcountry",
];

// 2. Update existing constant (remove old values)
export const ALL_AMENITIES: Amenity[] = [
  "restrooms",
  "showers",
  "food",
  "fuel",
  "repair",
  // REMOVED: "camping", "cabins"
];
```

**Layer 4: Display Formatting** (`src/lib/formatting.ts`)

For multi-word or special formatting needs:

```typescript
export function formatCamping(camping: Camping): string {
  const campingLabels: Record<Camping, string> = {
    tent: "Tent",
    rv30A: "RV 30A",           // Custom formatting
    rv50A: "RV 50A",           // Custom formatting
    fullHookup: "Full Hookup",
    cabin: "Cabin",
    groupSite: "Group Site",
    backcountry: "Backcountry / Walk-in",  // Custom formatting
  };
  return campingLabels[camping];
}
```

**Layer 5: API Queries** (All `src/app/api/**/route.ts` files)

Update EVERY Prisma query that fetches parks:

```typescript
// Files to update:
// - src/app/api/parks/route.ts
// - src/app/api/parks/[slug]/route.ts
// - src/app/api/favorites/route.ts
// - src/app/admin/parks/page.tsx
// - src/app/admin/parks/[id]/edit/page.tsx
// - src/app/profile/page.tsx
// - src/app/parks/[id]/page.tsx

const parks = await prisma.park.findMany({
  where: { status: "APPROVED" },
  include: {
    terrain: true,
    difficulty: true,
    amenities: true,
    camping: true,  // ← Add to ALL includes
  },
});
```

**Critical:** Missing this in ANY query will cause `camping: []` in that route!

**Layer 6: Park Creation** (`src/app/api/parks/submit/route.ts`)

```typescript
const park = await prisma.park.create({
  data: {
    name: data.name,
    // ... other fields
    amenities: {
      create: (data.amenities || []).map((a) => ({ amenity: a as Amenity })),
    },
    camping: {  // ← Add here
      create: (data.camping || []).map((c) => ({ camping: c as Camping })),
    },
  },
  include: {
    terrain: true,
    difficulty: true,
    amenities: true,
    camping: true,  // ← Add to include
  },
});
```

**Layer 7: Park Updates** (`src/app/api/admin/parks/[id]/route.ts`)

```typescript
// PATCH handler
const { camping } = await request.json();

await prisma.park.update({
  where: { id },
  data: {
    amenities: {
      deleteMany: {},
      create: amenities?.map((a: string) => ({ amenity: a })) || [],
    },
    camping: {  // ← Add here (deleteMany + create pattern)
      deleteMany: {},
      create: camping?.map((c: string) => ({ camping: c })) || [],
    },
  },
  include: {
    terrain: true,
    difficulty: true,
    amenities: true,
    camping: true,  // ← Add to include
  },
});
```

**Layer 8: Admin Edit Page** (`src/app/admin/parks/[id]/edit/page.tsx`)

Transform junction table data for form:

```typescript
const park = await prisma.park.findUnique({
  where: { id },
  include: {
    terrain: true,
    difficulty: true,
    amenities: true,
    camping: true,  // ← Add to include
  },
});

const initialData = {
  // ... other fields
  amenities: park.amenities.map((a) => a.amenity),
  camping: park.camping.map((c) => c.camping),  // ← Add transformation
};
```

#### Phase 3: UI Updates (5 Components)

**Component 1: Form Checkboxes** (`src/components/forms/ParkSubmissionForm.tsx`)

```typescript
// 1. Add to FormData interface
interface FormData {
  // ... existing fields
  amenities: string[];
  camping: string[];  // ← Add here
}

// 2. Add to initial state
const [formData, setFormData] = useState<FormData>({
  // ... existing fields
  amenities: initialData?.amenities || [],
  camping: initialData?.camping || [],  // ← Add here
});

// 3. Update handleCheckboxChange type
const handleCheckboxChange = (
  category: "terrain" | "difficulty" | "amenities" | "camping",  // ← Add "camping"
  value: string
) => {
  // Implementation stays the same
};

// 4. Add camping section to form JSX
<div>
  <Label className="mb-3 block">Camping Options</Label>
  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
    {ALL_CAMPING_TYPES.map((camping) => (
      <div key={camping} className="flex items-center space-x-2">
        <Checkbox
          id={`camping-${camping}`}
          checked={formData.camping.includes(camping)}
          onCheckedChange={() => handleCheckboxChange("camping", camping)}
        />
        <label
          htmlFor={`camping-${camping}`}
          className="text-sm font-medium cursor-pointer"
        >
          {formatCamping(camping as Camping)}
        </label>
      </div>
    ))}
  </div>
</div>
```

**Component 2: Search Filters** (`src/components/parks/SearchFiltersPanel.tsx`)

```typescript
// 1. Add props
interface SearchFiltersPanelProps {
  // ... existing props
  selectedCamping: string[];
  onCampingChange: (camping: string[]) => void;
}

// 2. Add toggle handler
const handleCampingToggle = (camping: string) => {
  onCampingChange(
    selectedCamping.includes(camping)
      ? selectedCamping.filter((c) => c !== camping)
      : [...selectedCamping, camping]
  );
};

// 3. Add camping filter section
<div className="mt-4">
  <div className="text-sm font-semibold mb-2">Camping</div>
  <div className="space-y-2">
    {ALL_CAMPING_TYPES.map((camping) => (
      <div key={camping} className="flex items-center space-x-2">
        <Checkbox
          id={`camping-${camping}`}
          checked={selectedCamping.includes(camping)}
          onCheckedChange={() => handleCampingToggle(camping)}
        />
        <label htmlFor={`camping-${camping}`}>
          {formatCamping(camping as Camping)}
        </label>
      </div>
    ))}
  </div>
</div>
```

**Component 3: Badge Display** (`src/components/shared/ParkBadges.tsx`)

```typescript
// Create new badge component
export interface CampingBadgesProps {
  camping: Camping[];
}

export function CampingBadges({ camping }: CampingBadgesProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {camping.map((c) => (
        <Badge key={c} variant="default">
          {formatCamping(c)}
        </Badge>
      ))}
    </div>
  );
}

// Use in park display components
import { CampingBadges } from "@/components/shared/ParkBadges";

<CampingBadges camping={park.camping} />
```

**Component 4: Filter Hook** (`src/hooks/useFilteredParks.ts`)

```typescript
// 1. Add state
const [selectedCamping, setSelectedCamping] = useState<string[]>([]);

// 2. Add filter logic
const filteredParks = useMemo(() => {
  let filteredList = [...parks];

  // ... existing filters

  // Apply camping filter
  if (selectedCamping.length > 0) {
    filteredList = filteredList.filter((park) =>
      park.camping.some((c) => selectedCamping.includes(c))
    );
  }

  return filteredList;
}, [parks, selectedCamping, /* other dependencies */]);

// 3. Add to clearAllFilters
const clearAllFilters = () => {
  // ... existing clears
  setSelectedCamping([]);
};

// 4. Return new state
return {
  // ... existing returns
  selectedCamping,
  setSelectedCamping,
  filteredParks,
  clearAllFilters,
};
```

**Component 5: Main App Component** (`src/components/ui/OffroadParksApp.tsx`)

```typescript
// Extract from hook and pass to SearchFiltersPanel
const { selectedCamping, setSelectedCamping } = useFilteredParks({ parks });

<SearchFiltersPanel
  {/* ... existing props */}
  selectedCamping={selectedCamping}
  onCampingChange={setSelectedCamping}
/>
```

#### Phase 4: Bulk Upload Updates

**File:** `src/app/api/admin/parks/bulk-upload/route.ts`

```typescript
// 1. Update BulkParkInput interface
interface BulkParkInput {
  // ... existing fields
  amenities?: string[];
  camping?: string[];  // ← Add here
}

// 2. Add validation
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

// 3. Add to transaction (after creating park)
if (park.camping && park.camping.length > 0) {
  await Promise.all(
    park.camping.map((camping) =>
      tx.parkCamping.create({
        data: {
          parkId: createdPark.id,
          camping: camping as Camping,
        },
      })
    )
  );
}
```

#### Phase 5: Testing Updates

**Critical: All tests must be updated to reflect the data model change.**

**Test Automation Strategy:**
1. First, run TypeScript compiler to find all compilation errors
2. Create automated fix script for common patterns
3. Manually fix remaining test-specific logic

**Example: Automated Test Fix Script**

```javascript
// fix-tests.js
const fs = require('fs');
const path = require('path');

function getAllTestFiles(dir, files = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      getAllTestFiles(fullPath, files);
    } else if (item.name.endsWith('.test.ts') || item.name.endsWith('.test.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

const testFiles = getAllTestFiles('./test');

testFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Add camping: [] after amenities in Park objects
  content = content.replace(
    /(amenities:\s*\[[^\]]*\]),(\s*\n)/g,
    '$1,\n      camping: [],$2'
  );

  fs.writeFileSync(file, content);
});
```

**Test Update Patterns:**

1. **Mock Park Data** - Add `camping: []` to all test Park objects
2. **API Route Tests** - Add `camping: true` to all Prisma `include` expectations
3. **Component Tests** - Update amenity-related tests:
   - Remove tests checking for "camping"/"cabins" amenity badges
   - Add tests for camping category checkboxes/badges
4. **Type Tests** - Update expected amenity counts and values

**Common Test Fixes:**

```typescript
// OLD: Test expecting "camping" as amenity
const mockPark = {
  amenities: ["camping", "restrooms"],
};
expect(screen.getByText("camping")).toBeInTheDocument();

// NEW: Test with camping as separate category
const mockPark = {
  amenities: ["restrooms"],
  camping: ["tent"],
};
expect(screen.getByText("tent")).toBeInTheDocument();

// OLD: API include expectation
expect(prisma.park.findMany).toHaveBeenCalledWith({
  include: {
    terrain: true,
    amenities: true,
  },
});

// NEW: Include camping relation
expect(prisma.park.findMany).toHaveBeenCalledWith({
  include: {
    terrain: true,
    amenities: true,
    camping: true,  // ← Add here
  },
});
```

**Test Files to Check:**
- All API route tests (`test/app/api/**/*.test.ts`)
- Component tests using Park data (`test/components/**/*.test.tsx`)
- Hook tests with filtering (`test/hooks/useFilteredParks.test.ts`)
- Type transformation tests (`test/lib/types.test.ts`)
- Constants tests (`test/lib/constants.test.ts`)

#### Phase 6: Verification Checklist

After completing all changes, verify:

**Type Safety:**
```bash
npx tsc --noEmit  # Must pass with zero errors
```

**Tests:**
```bash
npm test  # All 828 tests must pass
```

**Manual Testing:**
- [ ] Create new park with camping options
- [ ] Edit existing park, change camping values
- [ ] Filter parks by camping types
- [ ] View park cards with camping badges
- [ ] Admin bulk upload with camping data
- [ ] Admin edit page shows camping checkboxes

**Data Integrity:**
- [ ] Removed enum values no longer in database
- [ ] Junction table created and populated
- [ ] All API routes return camping data
- [ ] Transformation works correctly

### Lessons Learned & Best Practices

**1. Plan Data Migration First**
Before making any schema changes, decide how to handle existing data. Options:
- Delete conflicting records (acceptable for small datasets)
- Write migration script to preserve/transform data
- Use Prisma migrate for complex transformations

**2. Follow the 8-Layer Pattern**
Update layers in this order to maintain type safety:
1. Database Schema (Prisma)
2. TypeScript Types
3. Constants
4. Display Formatting
5. API Queries (includes)
6. API Creation
7. API Updates
8. Admin Edit Page

Skipping layers or doing them out of order causes compilation errors.

**3. Update ALL API Routes**
Missing even ONE include clause will cause empty data in that route. Search codebase:
```bash
grep -r "prisma.park.find" src/app/api
```

**4. Test Automation Saves Time**
For 800+ tests, create automated fix scripts for repetitive patterns:
- Adding `camping: []` to mock data
- Adding `camping: true` to includes
- Replacing removed enum values

**5. Component Reuse is Powerful**
`ParkSubmissionForm` is used for create AND edit. Update form once, both modes benefit.

**6. Expect Test Failures**
After major data model changes, expect 20-50 test failures. Systematically:
1. Run TypeScript compiler first
2. Fix type errors
3. Run tests, fix failures by category (API → Components → Hooks)

**7. Document As You Go**
Update PARK_DATA_MODEL.md with findings immediately while details are fresh.

### Time Estimates

For a change of this magnitude (removing 2 amenities, adding new 7-value category):

- Planning & data migration: 15 minutes
- Schema & type updates (8 layers): 45 minutes
- UI updates (5 components): 60 minutes
- Bulk upload updates: 20 minutes
- Test updates: 90 minutes
- Verification: 30 minutes

**Total: ~4 hours for experienced developer**

Most time spent on test updates due to volume (800+ tests across 54 files).

### Common Errors During This Change

1. **Prisma Data Loss Warning**: Attempting to remove enum values in use
   - Fix: Delete records first via Prisma Studio or SQL

2. **TypeScript Compilation Errors**: Missing camping field in 100+ locations
   - Fix: Automated script to add `camping: []`

3. **Test Failures**: 22 tests expecting "camping" as amenity
   - Fix: Update tests to use new camping category

4. **Missing Include Clauses**: API routes returning `camping: []`
   - Fix: Search and update all `prisma.park.find` calls

5. **Form Not Showing Camping**: Admin edit page missing transformation
   - Fix: Update `src/app/admin/parks/[id]/edit/page.tsx`

### Success Metrics

After completing this change:
- ✅ Zero TypeScript compilation errors
- ✅ All 828 tests passing
- ✅ 7 new camping options available across entire app
- ✅ All API routes return camping data
- ✅ Forms, filters, and badges work correctly
- ✅ Bulk upload validates camping options
- ✅ No regression in existing features

---

## Example: Complete Extension (Step-by-Step)

**Task:** Add `"waterfalls"` to terrain types

### 1. Update Prisma Schema
```prisma
enum Terrain {
  sand
  rocks
  mud
  trails
  hills
  waterfalls  // ← Add here
}
```

### 2. Update TypeScript Type
```typescript
export type Terrain = "sand" | "rocks" | "mud" | "trails" | "hills" | "waterfalls";
```

### 3. Update Constants
```typescript
export const ALL_TERRAIN_TYPES: Terrain[] = [
  "sand",
  "rocks",
  "mud",
  "trails",
  "hills",
  "waterfalls",  // ← Add here
];
```

### 4. Push to Database
```bash
npm run db:push
```

### 5. Test the Change
```bash
# Run affected tests
npx vitest run test/lib/types.test.ts
npx vitest run test/app/api/parks/submit/route.test.ts

# Build to verify no TypeScript errors
npm run build
```

### 6. Verify in UI
- ✅ Open park submission form → "waterfalls" checkbox appears
- ✅ Submit park with "waterfalls" selected
- ✅ Check search filters → "waterfalls" in terrain dropdown
- ✅ View park card → "waterfalls" badge displays
- ✅ Bulk upload accepts "waterfalls" in JSON (automatic via shared constants)

**Done!** No manual UI updates needed - components iterate over constants.

**Bulk Upload Bonus:** Since bulk upload uses `ALL_TERRAIN_TYPES` from constants, it automatically validates the new "waterfalls" value without any code changes!

---

## Testing Checklist

When adding new categorical data, test:

- [ ] Park creation API with new value
- [ ] Park update API replacing old values (admin edit)
- [ ] Admin edit page transforms data correctly for form
- [ ] Bulk upload API validates new value
- [ ] `transformDbPark()` handles new field
- [ ] Search filters include new value
- [ ] Park badges display new value
- [ ] Form validation accepts new value (create & edit modes)
- [ ] TypeScript compilation passes (`npx tsc --noEmit`)
- [ ] All tests pass (`npm test`)

---

## Usage Examples for Prompting

When requesting changes, reference this document:

**Adding new value:**
```
"Following PARK_DATA_MODEL.md, add 'wifi' to amenities"
```

**Adding new category:**
```
"Per PARK_DATA_MODEL.md, create a new SeasonalFeature category with values: 'winterTrails', 'summerCamping', 'fallFoliage'"
```

**Checking consistency:**
```
"Verify all terrain types follow the 3-layer pattern in PARK_DATA_MODEL.md"
```

This document serves as the **single source of truth** for park data model extensions.
