import type {
  Amenity,
  Camping,
  Ownership,
  RecommendedDuration,
  Terrain,
  VehicleType,
  VisitCondition,
} from "@/lib/types";

export function formatCurrency(value?: number): string {
  return typeof value === "number" ? `$${value.toFixed(0)}` : "—";
}

export function formatPhone(phone?: string): string {
  if (!phone) return "";

  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, "");

  // Format as XXX-XXX-XXXX
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  // Format as X-XXX-XXX-XXXX for 11 digits (with country code)
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 1)}-${cleaned.slice(1, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  // Return as-is if not a standard format
  return phone;
}

export function formatCamping(camping: Camping): string {
  const campingLabels: Record<Camping, string> = {
    tent: "Tent",
    rv30A: "RV 30A",
    rv50A: "RV 50A",
    fullHookup: "Full Hookup",
    cabin: "Cabin",
    groupSite: "Group Site",
    backcountry: "Backcountry / Walk-in",
  };
  return campingLabels[camping];
}

export function formatVisitCondition(condition: VisitCondition): string {
  const labels: Record<VisitCondition, string> = {
    dry: "Dry",
    muddy: "Muddy",
    snow: "Snow",
    wet: "Wet",
    mixed: "Mixed",
  };
  return labels[condition];
}

export function formatRecommendedDuration(duration: RecommendedDuration): string {
  const labels: Record<RecommendedDuration, string> = {
    quickRide: "Quick Ride",
    halfDay: "Half Day",
    fullDay: "Full Day",
    overnight: "Overnight",
  };
  return labels[duration];
}

export function formatVehicleType(vehicleType: VehicleType): string {
  const labels: Record<VehicleType, string> = {
    motorcycle: "Motorcycle",
    atv: "ATV",
    sxs: "SxS / UTV",
    fullSize: "Full Size 4x4",
  };
  return labels[vehicleType];
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export function formatOwnership(ownership: Ownership): string {
  const labels: Record<Ownership, string> = {
    private: "Private",
    public: "Public",
    mixed: "Mixed",
    unknown: "Unknown",
  };
  return labels[ownership];
}

export function formatAmenity(amenity: Amenity): string {
  const labels: Record<Amenity, string> = {
    restrooms: "Restrooms",
    showers: "Showers",
    food: "Food",
    fuel: "Fuel",
    repair: "Repair",
    boatRamp: "Boat Ramp",
    loadingRamp: "Loading Ramp",
    picnicTable: "Picnic Table",
    shelter: "Shelter",
    grill: "Grill",
    playground: "Playground",
    wifi: "WiFi",
    fishing: "Fishing",
    airStation: "Air Station",
    trailMaps: "Trail Maps",
    rentals: "Rentals",
    training: "Training",
    firstAid: "First Aid",
    store: "Store",
  };
  return labels[amenity];
}

export function formatTerrain(terrain: Terrain): string {
  const labels: Record<Terrain, string> = {
    sand: "Sand",
    rocks: "Rocks",
    mud: "Mud",
    trails: "Trails",
    hills: "Hills",
    motocrossTrack: "Motocross Track",
  };
  return labels[terrain];
}
