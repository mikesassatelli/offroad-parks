import { type DbPark, transformDbPark } from "@/lib/types";

describe("transformDbPark", () => {
  it("should transform a complete DbPark to Park format", () => {
    const dbPark: DbPark = {
      id: "123",
      name: "Test Park",
      slug: "test-park",
      city: "Test City",
      state: "CA",
      latitude: 34.0522,
      longitude: -118.2437,
      website: "https://testpark.com",
      phone: "5551234567",
      campingWebsite: null,
      campingPhone: null,
      dayPassUSD: 25,
      milesOfTrails: 50,
      acres: 1000,
      notes: "Great park for off-roading",
      status: "APPROVED",
      submitterId: null,
      submitterName: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      terrain: [{ terrain: "sand" }, { terrain: "rocks" }],
      difficulty: [{ difficulty: "moderate" }],
      amenities: [{ amenity: "restrooms" }, { amenity: "showers" }],
      camping: [],
      vehicleTypes: [],
    };

    const result = transformDbPark(dbPark);

    expect(result).toEqual({
      id: "test-park", // slug is used as id
      name: "Test Park",
      city: "Test City",
      state: "CA",
      coords: { lat: 34.0522, lng: -118.2437 },
      website: "https://testpark.com",
      phone: "5551234567",
      campingWebsite: undefined,
      campingPhone: undefined,
      dayPassUSD: 25,
      milesOfTrails: 50,
      acres: 1000,
      notes: "Great park for off-roading",
      terrain: ["sand", "rocks"],
      difficulty: ["moderate"],
      amenities: ["restrooms", "showers"],
      camping: [],
      vehicleTypes: [],
    });
  });

  it("should handle null values by converting to undefined", () => {
    const dbPark: DbPark = {
      id: "123",
      name: "Minimal Park",
      slug: "minimal-park",
      city: null,
      state: "TX",
      latitude: null,
      longitude: null,
      website: null,
      phone: null,
      campingWebsite: null,
      campingPhone: null,
      dayPassUSD: null,
      milesOfTrails: null,
      acres: null,
      notes: null,
      status: "APPROVED",
      submitterId: null,
      submitterName: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      terrain: [],
      difficulty: [],
      amenities: [],
      
      camping: [],vehicleTypes: [],
    };

    const result = transformDbPark(dbPark);

    expect(result).toEqual({
      id: "minimal-park",
      name: "Minimal Park",
      city: undefined,
      state: "TX",
      coords: undefined,
      website: undefined,
      phone: undefined,
      dayPassUSD: undefined,
      milesOfTrails: undefined,
      acres: undefined,
      notes: undefined,
      terrain: [],
      difficulty: [],
      amenities: [],
      
      camping: [],vehicleTypes: [],
    });
  });

  it("should not include coords if only latitude is present", () => {
    const dbPark: DbPark = {
      id: "123",
      name: "Park",
      slug: "park",
      city: null,
      state: "CA",
      latitude: 34.0522,
      longitude: null,
      website: null,
      phone: null,
      campingWebsite: null,
      campingPhone: null,
      dayPassUSD: null,
      milesOfTrails: null,
      acres: null,
      notes: null,
      status: "APPROVED",
      submitterId: null,
      submitterName: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      terrain: [],
      difficulty: [],
      amenities: [],
      
      camping: [],vehicleTypes: [],
    };

    const result = transformDbPark(dbPark);
    expect(result.coords).toBeUndefined();
  });

  it("should not include coords if only longitude is present", () => {
    const dbPark: DbPark = {
      id: "123",
      name: "Park",
      slug: "park",
      city: null,
      state: "CA",
      latitude: null,
      longitude: -118.2437,
      website: null,
      phone: null,
      campingWebsite: null,
      campingPhone: null,
      dayPassUSD: null,
      milesOfTrails: null,
      acres: null,
      notes: null,
      status: "APPROVED",
      submitterId: null,
      submitterName: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      terrain: [],
      difficulty: [],
      amenities: [],
      
      camping: [],vehicleTypes: [],
    };

    const result = transformDbPark(dbPark);
    expect(result.coords).toBeUndefined();
  });

  it("should correctly map terrain arrays", () => {
    const dbPark: DbPark = {
      id: "123",
      name: "Park",
      slug: "park",
      city: null,
      state: "CA",
      latitude: null,
      longitude: null,
      website: null,
      phone: null,
      campingWebsite: null,
      campingPhone: null,
      dayPassUSD: null,
      milesOfTrails: null,
      acres: null,
      notes: null,
      status: "APPROVED",
      submitterId: null,
      submitterName: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      terrain: [
        { terrain: "sand" },
        { terrain: "rocks" },
        { terrain: "mud" },
        { terrain: "trails" },
        { terrain: "hills" },
      ],
      difficulty: [],
      amenities: [],
      
      camping: [],vehicleTypes: [],
    };

    const result = transformDbPark(dbPark);
    expect(result.terrain).toEqual(["sand", "rocks", "mud", "trails", "hills"]);
  });

  it("should correctly map difficulty arrays", () => {
    const dbPark: DbPark = {
      id: "123",
      name: "Park",
      slug: "park",
      city: null,
      state: "CA",
      latitude: null,
      longitude: null,
      website: null,
      phone: null,
      campingWebsite: null,
      campingPhone: null,
      dayPassUSD: null,
      milesOfTrails: null,
      acres: null,
      notes: null,
      status: "APPROVED",
      submitterId: null,
      submitterName: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      terrain: [],
      difficulty: [
        { difficulty: "easy" },
        { difficulty: "moderate" },
        { difficulty: "difficult" },
        { difficulty: "extreme" },
      ],
      amenities: [],
      
      camping: [],vehicleTypes: [],
    };

    const result = transformDbPark(dbPark);
    expect(result.difficulty).toEqual([
      "easy",
      "moderate",
      "difficult",
      "extreme",
    ]);
  });

  it("should correctly map amenities arrays", () => {
    const dbPark: DbPark = {
      id: "123",
      name: "Park",
      slug: "park",
      city: null,
      state: "CA",
      latitude: null,
      longitude: null,
      website: null,
      phone: null,
      campingWebsite: null,
      campingPhone: null,
      dayPassUSD: null,
      milesOfTrails: null,
      acres: null,
      notes: null,
      status: "APPROVED",
      submitterId: null,
      submitterName: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      terrain: [],
      difficulty: [],
      amenities: [
        { amenity: "restrooms" },
        { amenity: "showers" },
        { amenity: "food" },
        { amenity: "fuel" },
        { amenity: "repair" },
      ],
      camping: [],
      vehicleTypes: [],
    };

    const result = transformDbPark(dbPark);
    expect(result.amenities).toEqual([
      "restrooms",
      "showers",
      "food",
      "fuel",
      "repair",
    ]);
  });

  it("should use slug as id for URL compatibility", () => {
    const dbPark: DbPark = {
      id: "uuid-12345",
      name: "Park",
      slug: "my-awesome-park",
      city: null,
      state: "CA",
      latitude: null,
      longitude: null,
      website: null,
      phone: null,
      campingWebsite: null,
      campingPhone: null,
      dayPassUSD: null,
      milesOfTrails: null,
      acres: null,
      notes: null,
      status: "APPROVED",
      submitterId: null,
      submitterName: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      terrain: [],
      difficulty: [],
      amenities: [],
      
      camping: [],vehicleTypes: [],
    };

    const result = transformDbPark(dbPark);
    expect(result.id).toBe("my-awesome-park");
    expect(result.id).not.toBe("uuid-12345");
  });
});
