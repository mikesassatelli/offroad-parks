/**
 * Type-level tests for Operator schema models.
 * These verify that the Prisma-generated types match the expected shape
 * without hitting the database.
 */
import { SubscriptionStatus, SubscriptionTier, ClaimStatus, UserRole } from "@prisma/client";
import { describe, it, expect } from "vitest";

describe("Operator schema enums", () => {
  it("SubscriptionStatus values are correct", () => {
    expect(SubscriptionStatus.TRIALING).toBe("TRIALING");
    expect(SubscriptionStatus.ACTIVE).toBe("ACTIVE");
    expect(SubscriptionStatus.PAST_DUE).toBe("PAST_DUE");
    expect(SubscriptionStatus.CANCELED).toBe("CANCELED");
    expect(SubscriptionStatus.UNPAID).toBe("UNPAID");
  });

  it("SubscriptionTier values are correct", () => {
    expect(SubscriptionTier.STANDARD).toBe("STANDARD");
    expect(SubscriptionTier.PREMIUM).toBe("PREMIUM");
  });

  it("ClaimStatus values are correct", () => {
    expect(ClaimStatus.PENDING).toBe("PENDING");
    expect(ClaimStatus.APPROVED).toBe("APPROVED");
    expect(ClaimStatus.REJECTED).toBe("REJECTED");
  });

  it("UserRole includes OPERATOR", () => {
    expect(UserRole.OPERATOR).toBe("OPERATOR");
    expect(UserRole.USER).toBe("USER");
    expect(UserRole.ADMIN).toBe("ADMIN");
  });
});
