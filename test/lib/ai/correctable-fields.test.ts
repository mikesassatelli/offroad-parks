import { describe, it, expect } from "vitest";
import {
  CORRECTABLE_FIELDS,
  isCorrectableField,
  correctableFieldType,
  humanizeFieldName,
  EXTRACTABLE_FIELDS,
} from "@/lib/ai/park-fields";

describe("correctable fields registry", () => {
  it("every correctable field exists in EXTRACTABLE_FIELDS", () => {
    for (const f of CORRECTABLE_FIELDS) {
      expect(EXTRACTABLE_FIELDS[f]).toBeDefined();
    }
  });

  it("isCorrectableField gates the curated subset", () => {
    expect(isCorrectableField("website")).toBe(true);
    expect(isCorrectableField("ownership")).toBe(true);
    expect(isCorrectableField("address.city")).toBe(true);
    // In EXTRACTABLE_FIELDS but intentionally NOT correctable:
    expect(isCorrectableField("latitude")).toBe(false);
    expect(isCorrectableField("notes")).toBe(false);
    // Fully unknown:
    expect(isCorrectableField("bogus")).toBe(false);
  });

  it("correctableFieldType returns the canonical value type", () => {
    expect(correctableFieldType("isFree")).toBe("boolean");
    expect(correctableFieldType("dayPassUSD")).toBe("number");
    expect(correctableFieldType("website")).toBe("string");
    expect(correctableFieldType("ownership")).toBe("Ownership");
  });

  it("registers hours as a correctable field with the 'hours' type", () => {
    expect(isCorrectableField("hours")).toBe(true);
    expect(correctableFieldType("hours")).toBe("hours");
    expect(EXTRACTABLE_FIELDS["hours"]).toBe("hours");
  });

  it("humanizeFieldName produces readable labels incl. address fields", () => {
    expect(humanizeFieldName("website")).toBe("Website");
    expect(humanizeFieldName("address.streetAddress")).toBe("Street address");
    expect(humanizeFieldName("contactEmail")).toBe("Contact email");
    expect(humanizeFieldName("hours")).toBe("Hours");
  });
});
