import { cn } from "@/lib/utils";

describe("cn (className merger)", () => {
  it("should merge single class name", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("should merge multiple class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
    expect(cn("foo", true && "bar", "baz")).toBe("foo bar baz");
  });

  it("should merge Tailwind classes correctly", () => {
    // twMerge should deduplicate and handle conflicting Tailwind classes
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("should handle arrays of classes", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("should handle objects with conditional classes", () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
  });

  it("should handle empty input", () => {
    expect(cn()).toBe("");
  });

  it("should handle undefined and null", () => {
    expect(cn("foo", undefined, "bar", null)).toBe("foo bar");
  });

  it("should handle complex mixed inputs", () => {
    const result = cn(
      "base-class",
      { "conditional-1": true, "conditional-2": false },
      ["array-1", "array-2"],
      undefined,
      "final-class",
    );
    expect(result).toBe("base-class conditional-1 array-1 array-2 final-class");
  });

  it("should handle Tailwind conflicts properly", () => {
    // Later classes should override earlier ones for the same property
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    expect(cn("p-4", "px-2")).toBe("p-4 px-2");
  });
});
