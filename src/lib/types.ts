export type Amenity =
  | "camping"
  | "showers"
  | "rv hookups"
  | "fuel"
  | "wash station"
  | "restaurant"
  | "rentals"
  | "trail maps";

export type Terrain =
  | "sand"
  | "mud"
  | "hardpack"
  | "rocky"
  | "desert"
  | "forest"
  | "hills"
  | "mountain";

export type Park = {
  id: string;
  name: string;
  city?: string;
  state: string; // 2-letter
  website?: string;
  phone?: string;
  coords?: { lat: number; lng: number };
  acres?: number;
  milesOfTrails?: number;
  dayPassUSD?: number;
  utvAllowed: boolean;
  terrain: Terrain[];
  amenities: Amenity[];
  difficulty: ("easy" | "moderate" | "hard")[];
  notes?: string;
};
