// Legacy types for backward compatibility
export type Amenity =
  | "restrooms"
  | "showers"
  | "food"
  | "fuel"
  | "repair"
  | "boatRamp"
  | "loadingRamp"
  | "picnicTable"
  | "shelter"
  | "grill"
  | "playground"
  | "wifi"
  | "fishing"
  | "airStation"
  | "trailMaps"
  | "rentals"
  | "training"
  | "firstAid"
  | "store";

export type Camping =
  | "tent"
  | "rv30A"
  | "rv50A"
  | "fullHookup"
  | "cabin"
  | "groupSite"
  | "backcountry";

export type Terrain =
  | "sand"
  | "rocks"
  | "mud"
  | "trails"
  | "hills"
  | "motocrossTrack";

export type VehicleType = "motorcycle" | "atv" | "sxs" | "fullSize";

// Status enum from Prisma
export type ParkStatus = "PENDING" | "APPROVED" | "REJECTED" | "DRAFT";

// Ownership type
export type Ownership = "private" | "public" | "mixed" | "unknown";

// Review system types
export type ReviewStatus = "PENDING" | "APPROVED" | "HIDDEN";

export type VisitCondition = "dry" | "muddy" | "snow" | "wet" | "mixed";

export type RecommendedDuration =
  | "quickRide"
  | "halfDay"
  | "fullDay"
  | "overnight";

// Address type for park location details (database format with null)
export type DbAddress = {
  id: string;
  parkId: string;
  streetAddress: string | null;
  streetAddress2: string | null;
  city: string | null;
  state: string; // Required for state-based filtering
  zipCode: string | null;
  county: string | null;
  latitude: number | null;
  longitude: number | null;
};

// Address type for client (transformed format with undefined)
export type Address = {
  streetAddress?: string;
  streetAddress2?: string;
  city?: string;
  state: string; // Required for state-based filtering
  zipCode?: string;
  county?: string;
  latitude?: number;
  longitude?: number;
};

// Database park type - matches Prisma Park model with includes
// This is a flexible type that accepts the actual Prisma query results
export type DbPark = {
  id: string;
  name: string;
  slug: string;
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
  // New operational fields
  datesOpen: string | null;
  contactEmail: string | null;
  ownership: Ownership | null;
  permitRequired: boolean | null;
  permitType: string | null;
  membershipRequired: boolean | null;
  maxVehicleWidthInches: number | null;
  flagsRequired: boolean | null;
  sparkArrestorRequired: boolean | null;
  noiseLimitDBA: number | null;
  // Submitter info
  submitterId: string | null;
  submitterName: string | null;
  // Aggregated review data
  averageRating: number | null;
  averageDifficulty: number | null;
  averageTerrain: number | null;
  averageFacilities: number | null;
  reviewCount: number;
  averageRecommendedStay: RecommendedDuration | null;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  // Relations
  terrain: Array<{ id?: string; parkId?: string; terrain: Terrain }>;
  amenities: Array<{ id?: string; parkId?: string; amenity: Amenity }>;
  camping: Array<{ id?: string; parkId?: string; camping: Camping }>;
  vehicleTypes: Array<{ id?: string; parkId?: string; vehicleType: VehicleType }>;
  address: DbAddress | null; // May be null from Prisma, but we ensure it exists for approved parks
  photos?: Array<{ id?: string; parkId?: string; userId?: string | null; url: string; caption?: string | null; status?: string; createdAt?: Date; updatedAt?: Date }>;
};

// Client-facing park type (transformed for UI compatibility)
export type Park = {
  id: string;
  name: string;
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
  vehicleTypes: VehicleType[];
  notes?: string;
  heroImage?: string | null;
  // New operational fields
  datesOpen?: string;
  contactEmail?: string;
  ownership?: Ownership;
  permitRequired?: boolean;
  permitType?: string;
  membershipRequired?: boolean;
  maxVehicleWidthInches?: number;
  flagsRequired?: boolean;
  sparkArrestorRequired?: boolean;
  noiseLimitDBA?: number;
  // Address (required - has state for filtering)
  address: Address;
  // Aggregated review data
  averageRating?: number;
  averageDifficulty?: number;
  averageTerrain?: number;
  averageFacilities?: number;
  reviewCount?: number;
  averageRecommendedStay?: RecommendedDuration;
};

// Database review type - matches Prisma ParkReview model with includes
export type DbReview = {
  id: string;
  parkId: string;
  userId: string;
  overallRating: number;
  terrainRating: number;
  facilitiesRating: number;
  difficultyRating: number;
  title: string | null;
  body: string;
  visitDate: Date | null;
  vehicleType: VehicleType | null;
  visitCondition: VisitCondition | null;
  recommendedDuration: RecommendedDuration | null;
  recommendedFor: string | null;
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  park?: {
    id: string;
    name: string;
    slug: string;
    address: {
      state: string;
    };
  };
  helpfulVotes?: Array<{ id: string; userId: string }>;
  _count?: {
    helpfulVotes: number;
  };
};

// Client-facing review type (transformed for UI compatibility)
export type Review = {
  id: string;
  parkId: string;
  parkSlug?: string;
  parkName?: string;
  parkState?: string;
  userId: string;
  userName: string;
  userImage?: string;
  overallRating: number;
  terrainRating: number;
  facilitiesRating: number;
  difficultyRating: number;
  title?: string;
  body: string;
  visitDate?: string;
  vehicleType?: VehicleType;
  visitCondition?: VisitCondition;
  recommendedDuration?: RecommendedDuration;
  recommendedFor?: string;
  status: ReviewStatus;
  helpfulCount: number;
  hasVotedHelpful?: boolean;
  createdAt: string;
  updatedAt: string;
};

// Transform database park to client park
export function transformDbPark(dbPark: DbPark): Park {
  // Address is required for approved parks, but may be null in DB
  // Use fallback state "Unknown" if somehow missing
  const address = dbPark.address ?? { state: "Unknown", streetAddress: null, streetAddress2: null, city: null, zipCode: null, county: null, latitude: null, longitude: null };

  return {
    id: dbPark.slug, // Use slug as id for URL compatibility
    name: dbPark.name,
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
    vehicleTypes: dbPark.vehicleTypes.map((v) => v.vehicleType),
    notes: dbPark.notes ?? undefined,
    // New operational fields
    datesOpen: dbPark.datesOpen ?? undefined,
    contactEmail: dbPark.contactEmail ?? undefined,
    ownership: dbPark.ownership ?? undefined,
    permitRequired: dbPark.permitRequired ?? undefined,
    permitType: dbPark.permitType ?? undefined,
    membershipRequired: dbPark.membershipRequired ?? undefined,
    maxVehicleWidthInches: dbPark.maxVehicleWidthInches ?? undefined,
    flagsRequired: dbPark.flagsRequired ?? undefined,
    sparkArrestorRequired: dbPark.sparkArrestorRequired ?? undefined,
    noiseLimitDBA: dbPark.noiseLimitDBA ?? undefined,
    // Address (required - has state for filtering)
    address: {
      streetAddress: address.streetAddress ?? undefined,
      streetAddress2: address.streetAddress2 ?? undefined,
      city: address.city ?? undefined,
      state: address.state, // Required
      zipCode: address.zipCode ?? undefined,
      county: address.county ?? undefined,
      latitude: address.latitude ?? undefined,
      longitude: address.longitude ?? undefined,
    },
    // Aggregated review data
    averageRating: dbPark.averageRating ?? undefined,
    averageDifficulty: dbPark.averageDifficulty ?? undefined,
    averageTerrain: dbPark.averageTerrain ?? undefined,
    averageFacilities: dbPark.averageFacilities ?? undefined,
    reviewCount: dbPark.reviewCount ?? undefined,
    averageRecommendedStay: dbPark.averageRecommendedStay ?? undefined,
  };
}

// Transform database review to client review
export function transformDbReview(
  dbReview: DbReview,
  currentUserId?: string
): Review {
  return {
    id: dbReview.id,
    parkId: dbReview.parkId,
    parkSlug: dbReview.park?.slug,
    parkName: dbReview.park?.name,
    parkState: dbReview.park?.address?.state,
    userId: dbReview.userId,
    userName: dbReview.user.name || "Anonymous",
    userImage: dbReview.user.image ?? undefined,
    overallRating: dbReview.overallRating,
    terrainRating: dbReview.terrainRating,
    facilitiesRating: dbReview.facilitiesRating,
    difficultyRating: dbReview.difficultyRating,
    title: dbReview.title ?? undefined,
    body: dbReview.body,
    visitDate: dbReview.visitDate?.toISOString() ?? undefined,
    vehicleType: dbReview.vehicleType ?? undefined,
    visitCondition: dbReview.visitCondition ?? undefined,
    recommendedDuration: dbReview.recommendedDuration ?? undefined,
    recommendedFor: dbReview.recommendedFor ?? undefined,
    status: dbReview.status,
    helpfulCount: dbReview._count?.helpfulVotes ?? dbReview.helpfulVotes?.length ?? 0,
    hasVotedHelpful: currentUserId
      ? dbReview.helpfulVotes?.some((v) => v.userId === currentUserId)
      : undefined,
    createdAt: dbReview.createdAt.toISOString(),
    updatedAt: dbReview.updatedAt.toISOString(),
  };
}
