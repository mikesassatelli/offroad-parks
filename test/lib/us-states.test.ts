import {
  US_STATE_NAMES,
  STATE_CODE_TO_NAME,
  normalizeStateName,
  stateCodeToName,
  isCanonicalStateName,
} from "@/lib/us-states";

describe("US_STATE_NAMES", () => {
  it("contains exactly 50 states", () => {
    expect(US_STATE_NAMES).toHaveLength(50);
  });

  it("is sorted alphabetically", () => {
    const sorted = [...US_STATE_NAMES].sort();
    expect(US_STATE_NAMES).toEqual(sorted);
  });

  it("has a matching code for every state name", () => {
    const namesFromCodes = new Set(Object.values(STATE_CODE_TO_NAME));
    for (const name of US_STATE_NAMES) {
      expect(namesFromCodes.has(name)).toBe(true);
    }
  });
});

describe("stateCodeToName", () => {
  it("resolves uppercase 2-letter codes", () => {
    expect(stateCodeToName("AR")).toBe("Arkansas");
    expect(stateCodeToName("CA")).toBe("California");
    expect(stateCodeToName("WY")).toBe("Wyoming");
  });

  it("resolves lowercase and mixed-case codes", () => {
    expect(stateCodeToName("ar")).toBe("Arkansas");
    expect(stateCodeToName("Ca")).toBe("California");
  });

  it("trims whitespace", () => {
    expect(stateCodeToName(" AR ")).toBe("Arkansas");
  });

  it("returns null for unknown codes", () => {
    expect(stateCodeToName("XX")).toBeNull();
    expect(stateCodeToName("")).toBeNull();
    expect(stateCodeToName("ARK")).toBeNull();
  });
});

describe("normalizeStateName", () => {
  it("accepts a canonical full name and returns it unchanged", () => {
    expect(normalizeStateName("Arkansas")).toBe("Arkansas");
    expect(normalizeStateName("New Mexico")).toBe("New Mexico");
  });

  it("normalizes an all-lowercase full name", () => {
    expect(normalizeStateName("arkansas")).toBe("Arkansas");
    expect(normalizeStateName("north carolina")).toBe("North Carolina");
  });

  it("normalizes an all-uppercase full name", () => {
    expect(normalizeStateName("ARKANSAS")).toBe("Arkansas");
  });

  it("normalizes a 2-letter code (uppercase)", () => {
    expect(normalizeStateName("AR")).toBe("Arkansas");
  });

  it("normalizes a 2-letter code (lowercase)", () => {
    expect(normalizeStateName("ar")).toBe("Arkansas");
  });

  it("normalizes a 2-letter code with mixed case", () => {
    expect(normalizeStateName("Ar")).toBe("Arkansas");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeStateName("  Arkansas  ")).toBe("Arkansas");
    expect(normalizeStateName("\tAR\n")).toBe("Arkansas");
  });

  it("collapses internal whitespace runs", () => {
    expect(normalizeStateName("new   mexico")).toBe("New Mexico");
  });

  it("returns null for empty or whitespace-only strings", () => {
    expect(normalizeStateName("")).toBeNull();
    expect(normalizeStateName("   ")).toBeNull();
  });

  it("returns null for unknown strings", () => {
    expect(normalizeStateName("Narnia")).toBeNull();
    expect(normalizeStateName("XX")).toBeNull();
    // "District of Columbia" is intentionally excluded from the 50-state list
    expect(normalizeStateName("District of Columbia")).toBeNull();
    expect(normalizeStateName("DC")).toBeNull();
  });

  it("returns null for non-string input", () => {
    expect(normalizeStateName(null)).toBeNull();
    expect(normalizeStateName(undefined)).toBeNull();
    expect(normalizeStateName(42)).toBeNull();
    expect(normalizeStateName({})).toBeNull();
    expect(normalizeStateName([])).toBeNull();
  });

  it("handles every 2-letter code in STATE_CODE_TO_NAME", () => {
    for (const [code, name] of Object.entries(STATE_CODE_TO_NAME)) {
      expect(normalizeStateName(code)).toBe(name);
      expect(normalizeStateName(code.toLowerCase())).toBe(name);
    }
  });

  it("handles every canonical full name", () => {
    for (const name of US_STATE_NAMES) {
      expect(normalizeStateName(name)).toBe(name);
      expect(normalizeStateName(name.toLowerCase())).toBe(name);
      expect(normalizeStateName(name.toUpperCase())).toBe(name);
    }
  });
});

describe("isCanonicalStateName", () => {
  it("returns true only for canonical names", () => {
    expect(isCanonicalStateName("Arkansas")).toBe(true);
    expect(isCanonicalStateName("arkansas")).toBe(false);
    expect(isCanonicalStateName("AR")).toBe(false);
    expect(isCanonicalStateName(null)).toBe(false);
    expect(isCanonicalStateName(undefined)).toBe(false);
  });
});
