// Legacy types for backward compatibility
export type Amenity =
  | "camping"
  | "cabins"
  | "restrooms"
  | "showers"
  | "food"
  | "fuel"
  | "repair";

export type Terrain = "sand" | "rocks" | "mud" | "trails" | "hills";

export type Difficulty = "easy" | "moderate" | "difficult" | "extreme";

export type VehicleType = "motorcycle" | "atv" | "sxs" | "fullSize";

// Database park type (from Prisma)
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
  dayPassUSD: number | null;
  milesOfTrails: number | null;
  acres: number | null;
  notes: string | null;
  terrain: Array<{ terrain: Terrain }>;
  difficulty: Array<{ difficulty: Difficulty }>;
  amenities: Array<{ amenity: Amenity }>;
  vehicleTypes: Array<{ vehicleType: VehicleType }>;
};

// Client-facing park type (transformed for UI compatibility)
export type Park = {
  id: string;
  name: string;
  city?: string;
  state: string;
  website?: string;
  phone?: string;
  coords?: { lat: number; lng: number };
  acres?: number;
  milesOfTrails?: number;
  dayPassUSD?: number;
  terrain: Terrain[];
  amenities: Amenity[];
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
    coords:
      dbPark.latitude && dbPark.longitude
        ? { lat: dbPark.latitude, lng: dbPark.longitude }
        : undefined,
    acres: dbPark.acres ?? undefined,
    milesOfTrails: dbPark.milesOfTrails ?? undefined,
    dayPassUSD: dbPark.dayPassUSD ?? undefined,
    terrain: dbPark.terrain.map((t) => t.terrain),
    amenities: dbPark.amenities.map((a) => a.amenity),
    difficulty: dbPark.difficulty.map((d) => d.difficulty),
    vehicleTypes: dbPark.vehicleTypes.map((v) => v.vehicleType),
    notes: dbPark.notes ?? undefined,
  };
}
