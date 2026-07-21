import { GET } from "@/app/api/parks/route";
import { getParkPage } from "@/lib/park-query";
import { vi } from "vitest";
import type { ParkPage } from "@/lib/park-query";

// The route delegates the actual query to getParkPage; here we assert it
// parses the request query string correctly and shapes the response.
vi.mock("@/lib/park-query", () => ({
  getParkPage: vi.fn(),
}));

const emptyPage: ParkPage = {
  parks: [],
  hasMore: false,
  nextPage: null,
  total: 0,
};

function req(query = ""): Request {
  return new Request(`http://localhost/api/parks${query}`);
}

describe("GET /api/parks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getParkPage).mockResolvedValue(emptyPage);
  });

  it("returns the paginated page shape", async () => {
    const page: ParkPage = {
      parks: [{ id: "p1", name: "Park 1", terrain: [], amenities: [], camping: [], vehicleTypes: [], address: { state: "CA" } }],
      hasMore: true,
      nextPage: 1,
      total: 30,
    };
    vi.mocked(getParkPage).mockResolvedValue(page);

    const response = await GET(req());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(page);
  });

  it("defaults to page 0 with the default page size", async () => {
    await GET(req());
    expect(getParkPage).toHaveBeenCalledWith(
      expect.objectContaining({ sort: "name" }),
      0,
      24,
    );
  });

  it("parses the requested page number", async () => {
    await GET(req("?page=3"));
    expect(getParkPage).toHaveBeenCalledWith(expect.anything(), 3, 24);
  });

  it("clamps invalid/negative pages to 0", async () => {
    await GET(req("?page=-4"));
    expect(getParkPage).toHaveBeenCalledWith(expect.anything(), 0, 24);
  });

  it("caps pageSize at 100", async () => {
    await GET(req("?pageSize=500"));
    expect(getParkPage).toHaveBeenCalledWith(expect.anything(), 0, 100);
  });

  it("forwards all filter params to getParkPage", async () => {
    await GET(
      req(
        "?q=sand&state=California&terrain=sand&terrain=rocks&amenity=fuel&camping=tent&vehicleType=atv&minTrailMiles=25&minAcres=500&minRating=4&ownership=public&permit=yes&membership=no&flags=yes&sparkArrestor=no&sort=rating",
      ),
    );

    expect(getParkPage).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "sand",
        state: "California",
        terrains: ["sand", "rocks"],
        amenities: ["fuel"],
        camping: ["tent"],
        vehicleTypes: ["atv"],
        minTrailMiles: 25,
        minAcres: 500,
        minRating: "4",
        ownership: "public",
        permitRequired: "yes",
        membershipRequired: "no",
        flagsRequired: "yes",
        sparkArrestorRequired: "no",
        sort: "rating",
      }),
      0,
      24,
    );
  });

  it("passes user coordinates through for distance sort", async () => {
    await GET(req("?sort=distance-nearest&lat=39.7&lng=-104.9"));
    expect(getParkPage).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: "distance-nearest",
        userLat: 39.7,
        userLng: -104.9,
      }),
      0,
      24,
    );
  });

  it("handles query errors gracefully", async () => {
    const err = new Error("boom");
    vi.mocked(getParkPage).mockRejectedValue(err);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(req());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to fetch parks" });
    expect(consoleSpy).toHaveBeenCalledWith("Error fetching parks:", err);
    consoleSpy.mockRestore();
  });
});
