import { describe, it, expect } from "vitest";
import {
  PARK_TO_FORM_FIELD_MAP,
  BULK_UPLOAD_FIELD_MAP,
} from "@/lib/field-coverage";

describe("field-coverage", () => {
  describe("PARK_TO_FORM_FIELD_MAP", () => {
    it("maps helmetsRequired to its form field name", () => {
      expect(PARK_TO_FORM_FIELD_MAP.helmetsRequired).toBe("helmetsRequired");
    });

    it("includes the other new-style requirement fields", () => {
      expect(PARK_TO_FORM_FIELD_MAP.flagsRequired).toBe("flagsRequired");
      expect(PARK_TO_FORM_FIELD_MAP.sparkArrestorRequired).toBe(
        "sparkArrestorRequired"
      );
      expect(PARK_TO_FORM_FIELD_MAP.permitRequired).toBe("permitRequired");
      expect(PARK_TO_FORM_FIELD_MAP.permitType).toBe("permitType");
      expect(PARK_TO_FORM_FIELD_MAP.membershipRequired).toBe(
        "membershipRequired"
      );
    });

    it("splits coords into latitude and longitude inputs", () => {
      expect(PARK_TO_FORM_FIELD_MAP.coords).toEqual(["latitude", "longitude"]);
    });

    it("renames city/state to address-prefixed fields", () => {
      expect(PARK_TO_FORM_FIELD_MAP.city).toBe("addressCity");
      expect(PARK_TO_FORM_FIELD_MAP.state).toBe("addressState");
    });

    it("preserves nested address mappings", () => {
      expect(PARK_TO_FORM_FIELD_MAP.address.streetAddress).toBe("streetAddress");
      expect(PARK_TO_FORM_FIELD_MAP.address.zipCode).toBe("zipCode");
      expect(PARK_TO_FORM_FIELD_MAP.address.county).toBe("county");
    });
  });

  describe("BULK_UPLOAD_FIELD_MAP", () => {
    it("includes helmetsRequired for bulk CSV upload", () => {
      expect(BULK_UPLOAD_FIELD_MAP.helmetsRequired).toBe("helmetsRequired");
    });

    it("includes all operational requirement fields", () => {
      expect(BULK_UPLOAD_FIELD_MAP.flagsRequired).toBe("flagsRequired");
      expect(BULK_UPLOAD_FIELD_MAP.sparkArrestorRequired).toBe(
        "sparkArrestorRequired"
      );
      expect(BULK_UPLOAD_FIELD_MAP.permitRequired).toBe("permitRequired");
      expect(BULK_UPLOAD_FIELD_MAP.permitType).toBe("permitType");
      expect(BULK_UPLOAD_FIELD_MAP.membershipRequired).toBe(
        "membershipRequired"
      );
      expect(BULK_UPLOAD_FIELD_MAP.maxVehicleWidthInches).toBe(
        "maxVehicleWidthInches"
      );
      expect(BULK_UPLOAD_FIELD_MAP.noiseLimitDBA).toBe("noiseLimitDBA");
    });

    it("keeps state/city as flat CSV columns", () => {
      expect(BULK_UPLOAD_FIELD_MAP.state).toBe("state");
      expect(BULK_UPLOAD_FIELD_MAP.city).toBe("city");
    });

    it("exposes address CSV columns at the top level", () => {
      expect(BULK_UPLOAD_FIELD_MAP.streetAddress).toBe("streetAddress");
      expect(BULK_UPLOAD_FIELD_MAP.zipCode).toBe("zipCode");
      expect(BULK_UPLOAD_FIELD_MAP.county).toBe("county");
    });
  });
});
