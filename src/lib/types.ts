// Legacy types for backward compatibility
export type Amenity = "restrooms" | "showers" | "food" | "fuel" | "repair";

export type Camping =
  | "tent"
  | "rv30A"
  | "rv50A"
  | "fullHookup"
  | "cabin"
  | "groupSite"
  | "backcountry";

export type Terrain = "sand" | "rocks" | "mud" | "trails" | "hills";

export type Difficulty = "easy" | "moderate" | "difficult" | "extreme";

export type VehicleType = "motorcycle" | "atv" | "sxs" | "fullSize";

// Status enum from Prisma
export type ParkStatus = "PENDING" | "APPROVED" | "REJECTED" | "DRAFT";

// Database park type - matches Prisma Park model with includes
// This is a flexible type that accepts the actual Prisma query results
export type DbPark = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  phone: string | null;
  campingWebsite: string | null;
  campingPhone: string | null;
  dayPassUSD: number | null;
  milesOfTrails: number | null;
  acres: number | null;
  notes: string | null;
  status: ParkStatus;
  submitterId: string | null;
  submitterName: string | null;
  createdAt: Date;
  updatedAt: Date;
  terrain: Array<{ id?: string; parkId?: string; terrain: Terrain }>;
  difficulty: Array<{ id?: string; parkId?: string; difficulty: Difficulty }>;
  amenities: Array<{ id?: string; parkId?: string; amenity: Amenity }>;
  camping: Array<{ id?: string; parkId?: string; camping: Camping }>;
  vehicleTypes: Array<{ id?: string; parkId?: string; vehicleType: VehicleType }>;
  photos?: Array<{ id?: string; parkId?: string; userId?: string | null; url: string; caption?: string | null; status?: string; createdAt?: Date; updatedAt?: Date }>;
};

// Client-facing park type (transformed for UI compatibility)
export type Park = {
  id: string;
  name: string;
  city?: string;
  state: string;
  website?: string;
  phone?: string;
  campingWebsite?: string;
  campingPhone?: string;
  coords?: { lat: number; lng: number };
  acres?: number;
  milesOfTrails?: number;
  dayPassUSD?: number;
  terrain: Terrain[];
  amenities: Amenity[];
  camping: Camping[];
  difficulty: Difficulty[];
  vehicleTypes: VehicleType[];
  notes?: string;
  heroImage?: string | null;
};

// Transform database park to client park
export function transformDbPark(dbPark: DbPark): Park {
  return {
    id: dbPark.slug, // Use slug as id for URL compatibility
    name: dbPark.name,
    city: dbPark.city ?? undefined,
    state: dbPark.state,
    website: dbPark.website ?? undefined,
    phone: dbPark.phone ?? undefined,
    campingWebsite: dbPark.campingWebsite ?? undefined,
    campingPhone: dbPark.campingPhone ?? undefined,
    coords:
      dbPark.latitude && dbPark.longitude
        ? { lat: dbPark.latitude, lng: dbPark.longitude }
        : undefined,
    acres: dbPark.acres ?? undefined,
    milesOfTrails: dbPark.milesOfTrails ?? undefined,
    dayPassUSD: dbPark.dayPassUSD ?? undefined,
    terrain: dbPark.terrain.map((t) => t.terrain),
    amenities: dbPark.amenities.map((a) => a.amenity),
    camping: dbPark.camping.map((c) => c.camping),
    difficulty: dbPark.difficulty.map((d) => d.difficulty),
    vehicleTypes: dbPark.vehicleTypes.map((v) => v.vehicleType),
    notes: dbPark.notes ?? undefined,
  };
}
