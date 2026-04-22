import { describe, it, expect } from "vitest";
import { resolveParkHeroImage } from "@/lib/park-hero";

describe("resolveParkHeroImage", () => {
  const approvedPhotoA = {
    id: "photo-a",
    url: "https://example.com/a.jpg",
    status: "APPROVED" as const,
  };
  const approvedPhotoB = {
    id: "photo-b",
    url: "https://example.com/b.jpg",
    status: "APPROVED" as const,
  };

  describe("AUTO source (default)", () => {
    it("returns the first approved photo URL when photos exist", () => {
      expect(
        resolveParkHeroImage({
          heroSource: "AUTO",
          photos: [approvedPhotoA, approvedPhotoB],
        })
      ).toBe(approvedPhotoA.url);
    });

    it("falls back to null when there are no photos (caller uses map hero)", () => {
      expect(
        resolveParkHeroImage({ heroSource: "AUTO", photos: [] })
      ).toBeNull();
    });

    it("defaults to AUTO when heroSource is missing", () => {
      expect(
        resolveParkHeroImage({ photos: [approvedPhotoA] })
      ).toBe(approvedPhotoA.url);
    });
  });

  describe("MAP source", () => {
    it("returns null regardless of photos (caller renders map hero)", () => {
      expect(
        resolveParkHeroImage({
          heroSource: "MAP",
          photos: [approvedPhotoA],
        })
      ).toBeNull();
    });

    it("returns null when no photos either", () => {
      expect(
        resolveParkHeroImage({ heroSource: "MAP", photos: [] })
      ).toBeNull();
    });
  });

  describe("PHOTO source", () => {
    it("returns the selected heroPhoto URL when APPROVED", () => {
      expect(
        resolveParkHeroImage({
          heroSource: "PHOTO",
          heroPhotoId: approvedPhotoB.id,
          heroPhoto: approvedPhotoB,
          photos: [approvedPhotoA, approvedPhotoB],
        })
      ).toBe(approvedPhotoB.url);
    });

    it("falls back to AUTO when heroPhoto is REJECTED", () => {
      expect(
        resolveParkHeroImage({
          heroSource: "PHOTO",
          heroPhotoId: approvedPhotoB.id,
          heroPhoto: { ...approvedPhotoB, status: "REJECTED" },
          photos: [approvedPhotoA],
        })
      ).toBe(approvedPhotoA.url);
    });

    it("falls back to AUTO when heroPhoto relation is missing and no match in photos", () => {
      expect(
        resolveParkHeroImage({
          heroSource: "PHOTO",
          heroPhotoId: "missing-photo-id",
          heroPhoto: null,
          photos: [approvedPhotoA],
        })
      ).toBe(approvedPhotoA.url);
    });

    it("falls back to null when PHOTO is selected, photo is missing, and no other photos", () => {
      expect(
        resolveParkHeroImage({
          heroSource: "PHOTO",
          heroPhotoId: "missing-photo-id",
          heroPhoto: null,
          photos: [],
        })
      ).toBeNull();
    });

    it("falls back to AUTO when heroPhotoId is null", () => {
      expect(
        resolveParkHeroImage({
          heroSource: "PHOTO",
          heroPhotoId: null,
          photos: [approvedPhotoA],
        })
      ).toBe(approvedPhotoA.url);
    });

    it("resolves heroPhotoId from photos list when relation not loaded", () => {
      expect(
        resolveParkHeroImage({
          heroSource: "PHOTO",
          heroPhotoId: approvedPhotoB.id,
          photos: [approvedPhotoA, approvedPhotoB],
        })
      ).toBe(approvedPhotoB.url);
    });
  });
});
