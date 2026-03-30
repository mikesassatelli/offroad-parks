import { calculateRecommendedStay } from "@/lib/review-utils";
import { prisma } from "@/lib/prisma";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type { RecommendedDuration } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    parkReview: {
      groupBy: vi.fn(),
      aggregate: vi.fn(),
    },
    park: {
      update: vi.fn(),
    },
  },
}));

const mockGroupBy = prisma.parkReview.groupBy as ReturnType<typeof vi.fn>;

function makeRows(counts: Partial<Record<RecommendedDuration, number>>) {
  return Object.entries(counts).map(([duration, count]) => ({
    recommendedDuration: duration as RecommendedDuration,
    _count: { recommendedDuration: count },
  }));
}

describe("calculateRecommendedStay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no reviews have a duration", async () => {
    mockGroupBy.mockResolvedValue([]);
    const result = await calculateRecommendedStay("park-1");
    expect(result).toBeNull();
  });

  it("returns the single duration when all reviews agree", async () => {
    mockGroupBy.mockResolvedValue(makeRows({ fullDay: 5 }));
    expect(await calculateRecommendedStay("park-1")).toBe("fullDay");
  });

  it("returns overnight when all reviews are overnight", async () => {
    mockGroupBy.mockResolvedValue(makeRows({ overnight: 3 }));
    expect(await calculateRecommendedStay("park-1")).toBe("overnight");
  });

  // Ceiling / tie-break behaviour
  it("rounds up on an exact tie between quickRide and halfDay", async () => {
    // mean = (1+2)/2 = 1.5 → ceil → 2 → halfDay
    mockGroupBy.mockResolvedValue(makeRows({ quickRide: 1, halfDay: 1 }));
    expect(await calculateRecommendedStay("park-1")).toBe("halfDay");
  });

  it("rounds up when quickRide plurality vs halfDay minority", async () => {
    // 4×quickRide + 3×halfDay → mean = (4+6)/7 = 1.43 → ceil → 2 → halfDay
    mockGroupBy.mockResolvedValue(makeRows({ quickRide: 4, halfDay: 3 }));
    expect(await calculateRecommendedStay("park-1")).toBe("halfDay");
  });

  it("a single overnight vote among quickRide voters pushes result up", async () => {
    // 5×quickRide + 1×overnight → mean = (5+4)/6 = 1.5 → ceil → 2 → halfDay
    mockGroupBy.mockResolvedValue(makeRows({ quickRide: 5, overnight: 1 }));
    expect(await calculateRecommendedStay("park-1")).toBe("halfDay");
  });

  it("strong overnight majority returns overnight", async () => {
    // 1×halfDay + 5×overnight → mean = (2+20)/6 = 3.67 → ceil → 4 → overnight
    mockGroupBy.mockResolvedValue(makeRows({ halfDay: 1, overnight: 5 }));
    expect(await calculateRecommendedStay("park-1")).toBe("overnight");
  });

  it("spread across all four durations rounds up correctly", async () => {
    // 2×quickRide + 2×halfDay + 2×fullDay + 2×overnight
    // mean = (2+4+6+8)/8 = 2.5 → ceil → 3 → fullDay
    mockGroupBy.mockResolvedValue(
      makeRows({ quickRide: 2, halfDay: 2, fullDay: 2, overnight: 2 }),
    );
    expect(await calculateRecommendedStay("park-1")).toBe("fullDay");
  });

  it("does not exceed overnight (ordinal 4) as the maximum", async () => {
    mockGroupBy.mockResolvedValue(makeRows({ overnight: 100 }));
    expect(await calculateRecommendedStay("park-1")).toBe("overnight");
  });

  it("heavy quickRide split with one fullDay still rounds up", async () => {
    // 3×quickRide + 1×fullDay → mean = (3+3)/4 = 1.5 → ceil → 2 → halfDay
    mockGroupBy.mockResolvedValue(makeRows({ quickRide: 3, fullDay: 1 }));
    expect(await calculateRecommendedStay("park-1")).toBe("halfDay");
  });
});
