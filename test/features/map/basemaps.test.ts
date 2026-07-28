import { describe, expect, it } from "vitest";
import { BASEMAPS } from "@/features/map/basemaps";

describe("BASEMAPS", () => {
  it("offers streets, satellite, and topo", () => {
    expect(BASEMAPS.map((b) => b.name)).toEqual([
      "Streets",
      "Satellite",
      "Topo",
    ]);
  });

  it("defaults to Streets (first entry)", () => {
    expect(BASEMAPS[0].name).toBe("Streets");
  });

  it("uses Esri World Imagery for satellite with {z}/{y}/{x} tile ordering", () => {
    const satellite = BASEMAPS.find((b) => b.name === "Satellite");
    expect(satellite).toBeDefined();
    expect(satellite!.url).toContain("World_Imagery");
    // Esri serves {z}/{y}/{x}; the usual {z}/{x}/{y} would return wrong tiles.
    expect(satellite!.url).toContain("{z}/{y}/{x}");
    expect(satellite!.url).not.toContain("{z}/{x}/{y}");
  });

  it("gives every basemap an attribution and a maxZoom", () => {
    for (const base of BASEMAPS) {
      expect(base.attribution.length).toBeGreaterThan(0);
      expect(base.maxZoom).toBeGreaterThan(0);
      expect(base.url).toMatch(/^https:\/\//);
    }
  });
});
