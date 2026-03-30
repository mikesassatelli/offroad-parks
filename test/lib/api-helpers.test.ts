import { requireAdmin, requireAuth } from "@/lib/api-helpers";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

describe("requireAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when no session", async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await requireAdmin();

    expect(result).toBeInstanceOf(NextResponse);
    const response = result as NextResponse;
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("should return 401 when session has no user id", async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ user: {} });

    const result = await requireAdmin();

    expect(result).toBeInstanceOf(NextResponse);
    const response = result as NextResponse;
    expect(response.status).toBe(401);
  });

  it("should return 403 when user is not admin", async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: "user-1", role: "USER" },
    });

    const result = await requireAdmin();

    expect(result).toBeInstanceOf(NextResponse);
    const response = result as NextResponse;
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Forbidden");
  });

  it("should return session when user is admin", async () => {
    const session = { user: { id: "admin-1", role: "ADMIN" } };
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(session);

    const result = await requireAdmin();

    expect(result).not.toBeInstanceOf(NextResponse);
    expect(result).toEqual(session);
  });
});

describe("requireAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when no session", async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await requireAuth();

    expect(result).toBeInstanceOf(NextResponse);
    const response = result as NextResponse;
    expect(response.status).toBe(401);
  });

  it("should return session when user is authenticated", async () => {
    const session = { user: { id: "user-1", role: "USER" } };
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(session);

    const result = await requireAuth();

    expect(result).not.toBeInstanceOf(NextResponse);
    expect(result).toEqual(session);
  });

  it("should return session for any role (not just admin)", async () => {
    const session = { user: { id: "user-1", role: "USER" } };
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(session);

    const result = await requireAuth();

    expect(result).toEqual(session);
  });
});
