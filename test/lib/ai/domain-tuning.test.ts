import { describe, it, expect } from "vitest";
import {
  computeDomainAdjustments,
  type DomainAccuracyStat,
  type DomainRow,
} from "@/lib/ai/domain-tuning";

const stat = (
  domain: string,
  approves: number,
  rejects: number
): DomainAccuracyStat => {
  const total = approves + rejects;
  return {
    domain,
    totalApproves: approves,
    totalRejects: rejects,
    accuracy: total > 0 ? approves / total : 0,
    sourceCount: 1,
  };
};

const row = (over: Partial<DomainRow> & { domainPattern: string }): DomainRow => ({
  defaultReliability: 50,
  isBlocked: false,
  locked: false,
  ...over,
});

describe("computeDomainAdjustments — score nudging", () => {
  it("nudges toward observed accuracy, capped at maxStep", () => {
    // 90% accurate over 20 reviews → target 90, but current 50, step capped at 10.
    const { updates } = computeDomainAdjustments(
      [stat("good.com", 18, 2)],
      [row({ domainPattern: "good.com", defaultReliability: 50 })],
      { minSample: 10, maxStep: 10 }
    );
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({ from: 50, to: 60, domainPattern: "good.com" });
  });

  it("moves down toward a low accuracy target", () => {
    const { updates } = computeDomainAdjustments(
      [stat("meh.com", 6, 14)], // 30%
      [row({ domainPattern: "meh.com", defaultReliability: 50 })],
      { minSample: 10, maxStep: 10 }
    );
    expect(updates[0]).toMatchObject({ from: 50, to: 40 });
  });

  it("skips domains below the sample threshold", () => {
    const { updates } = computeDomainAdjustments(
      [stat("new.com", 3, 0)],
      [],
      { minSample: 10 }
    );
    expect(updates).toHaveLength(0);
  });

  it("does not touch locked domains", () => {
    const { updates } = computeDomainAdjustments(
      [stat("pinned.com", 20, 0)],
      [row({ domainPattern: "pinned.com", defaultReliability: 50, locked: true })],
      { minSample: 10 }
    );
    expect(updates).toHaveLength(0);
  });

  it("does not touch blocked domains", () => {
    const { updates } = computeDomainAdjustments(
      [stat("bad.com", 20, 0)],
      [row({ domainPattern: "bad.com", defaultReliability: 0, isBlocked: true })],
      { minSample: 10 }
    );
    expect(updates).toHaveLength(0);
  });

  it("flags new high-signal domains for creation (isNew)", () => {
    const { updates } = computeDomainAdjustments(
      [stat("fresh.com", 20, 0)],
      [],
      { minSample: 10, maxStep: 10 }
    );
    expect(updates[0]).toMatchObject({ isNew: true, from: 50, to: 60 });
  });

  it("no-ops when the score already matches the target", () => {
    const { updates } = computeDomainAdjustments(
      [stat("steady.com", 10, 10)], // 50%
      [row({ domainPattern: "steady.com", defaultReliability: 50 })],
      { minSample: 10 }
    );
    expect(updates).toHaveLength(0);
  });
});

describe("computeDomainAdjustments — block suggestions", () => {
  it("suggests blocking high-volume, low-accuracy, unblocked domains", () => {
    const { blockSuggestions } = computeDomainAdjustments(
      [stat("spam.com", 1, 19)], // 5% over 20
      [],
      { blockMinSample: 8, blockAccuracyThreshold: 0.25 }
    );
    expect(blockSuggestions).toHaveLength(1);
    expect(blockSuggestions[0].domainPattern).toBe("spam.com");
  });

  it("does not suggest blocking domains already blocked", () => {
    const { blockSuggestions } = computeDomainAdjustments(
      [stat("spam.com", 1, 19)],
      [row({ domainPattern: "spam.com", isBlocked: true })],
      { blockMinSample: 8, blockAccuracyThreshold: 0.25 }
    );
    expect(blockSuggestions).toHaveLength(0);
  });

  it("does not suggest blocking low-volume domains", () => {
    const { blockSuggestions } = computeDomainAdjustments(
      [stat("rare.com", 0, 3)],
      [],
      { blockMinSample: 8 }
    );
    expect(blockSuggestions).toHaveLength(0);
  });

  it("does not suggest blocking accurate domains", () => {
    const { blockSuggestions } = computeDomainAdjustments(
      [stat("good.com", 18, 2)],
      [],
      { blockMinSample: 8, blockAccuracyThreshold: 0.25 }
    );
    expect(blockSuggestions).toHaveLength(0);
  });
});
