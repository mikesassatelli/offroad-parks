import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateObject } from "ai";
import { validateParkRelevance } from "@/lib/ai/wrong-park-guard";

vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));

vi.mock("@/lib/ai/config", () => ({
  EXTRACTION_MODEL: "mock-model",
}));

const mockGenerateObject = vi.mocked(generateObject);

describe("validateParkRelevance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return isRelevant: true when content is about the target park", async () => {
    mockGenerateObject.mockResolvedValue({
      object: {
        isAboutTargetPark: true,
        reason: "The page is primarily about Hollister Hills SVRA.",
      },
      usage: { inputTokens: 500, outputTokens: 50 },
    } as never);

    const result = await validateParkRelevance(
      "Hollister Hills SVRA",
      "California",
      "Welcome to Hollister Hills State Vehicular Recreation Area. We offer 150 miles of trails for OHV riding.",
    );

    expect(result.isRelevant).toBe(true);
    expect(result.reason).toBe(
      "The page is primarily about Hollister Hills SVRA.",
    );
    expect(result.inputTokens).toBe(500);
    expect(result.outputTokens).toBe(50);
  });

  it("should return isRelevant: false when content is about a different park", async () => {
    mockGenerateObject.mockResolvedValue({
      object: {
        isAboutTargetPark: false,
        reason:
          "This is a directory page listing dozens of OHV parks in California.",
      },
      usage: { inputTokens: 600, outputTokens: 40 },
    } as never);

    const result = await validateParkRelevance(
      "Hollister Hills SVRA",
      "California",
      "California OHV Parks Directory: Hollister Hills, Oceano Dunes, Carnegie, Hungry Valley...",
    );

    expect(result.isRelevant).toBe(false);
    expect(result.reason).toBe(
      "This is a directory page listing dozens of OHV parks in California.",
    );
    expect(result.inputTokens).toBe(600);
    expect(result.outputTokens).toBe(40);
  });

  it("should truncate content to 4000 characters", async () => {
    mockGenerateObject.mockResolvedValue({
      object: { isAboutTargetPark: true, reason: "Content is relevant." },
      usage: { inputTokens: 800, outputTokens: 30 },
    } as never);

    const longContent = "A".repeat(10_000);
    await validateParkRelevance("Test Park", "Texas", longContent);

    const callArgs = mockGenerateObject.mock.calls[0]![0];
    const prompt = callArgs.prompt as string;

    // The prompt should contain the truncated content (4000 chars of "A")
    // but NOT the full 10,000 chars
    expect(prompt).toContain("A".repeat(4000));
    expect(prompt).not.toContain("A".repeat(4001));
  });

  it("should return zero tokens when usage is undefined", async () => {
    mockGenerateObject.mockResolvedValue({
      object: { isAboutTargetPark: true, reason: "Relevant content." },
      usage: undefined,
    } as never);

    const result = await validateParkRelevance(
      "Test Park",
      "Texas",
      "Some content about Test Park.",
    );

    expect(result.inputTokens).toBe(0);
    expect(result.outputTokens).toBe(0);
  });

  it("should pass the correct system and user prompts", async () => {
    mockGenerateObject.mockResolvedValue({
      object: { isAboutTargetPark: true, reason: "Relevant." },
      usage: { inputTokens: 100, outputTokens: 20 },
    } as never);

    await validateParkRelevance("Red River Gorge OHV", "Kentucky", "Trail info here.");

    const callArgs = mockGenerateObject.mock.calls[0]![0];
    expect(callArgs.system).toBe(
      "You are validating whether web page content is primarily about a specific off-road park. Answer based on the content provided.",
    );
    expect(callArgs.prompt).toContain("Red River Gorge OHV");
    expect(callArgs.prompt).toContain("Kentucky");
    expect(callArgs.prompt).toContain("Trail info here.");
  });
});
