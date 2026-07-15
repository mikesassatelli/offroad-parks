import {
  parseJsonBody,
  requireAdmin,
  requireAuth,
  requireSuperAdmin,
} from "@/lib/api-helpers";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
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

  it("should return session when user is super admin", async () => {
    const session = { user: { id: "su-1", role: "SUPER_ADMIN" } };
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(session);

    const result = await requireAdmin();

    expect(result).not.toBeInstanceOf(NextResponse);
    expect(result).toEqual(session);
  });
});

describe("requireSuperAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when no session", async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await requireSuperAdmin();

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(401);
  });

  it("should return 403 when user is a regular admin", async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: "admin-1", role: "ADMIN" },
    });

    const result = await requireSuperAdmin();

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
  });

  it("should return session when user is super admin", async () => {
    const session = { user: { id: "su-1", role: "SUPER_ADMIN" } };
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(session);

    const result = await requireSuperAdmin();

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

describe("parseJsonBody", () => {
  const schema = z.object({
    name: z.string().min(1, "Name is required"),
    age: z.number().int().min(0).optional(),
  });

  const makeRequest = (body: string) =>
    new Request("http://localhost/x", {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
    });

  it("returns typed data for a valid body", async () => {
    const result = await parseJsonBody(
      makeRequest(JSON.stringify({ name: "Ada", age: 30 })),
      schema,
    );
    expect("data" in result).toBe(true);
    if ("data" in result) {
      expect(result.data).toEqual({ name: "Ada", age: 30 });
    }
  });

  it("returns a 400 'Invalid JSON' response for malformed JSON", async () => {
    const result = await parseJsonBody(makeRequest("not-json"), schema);
    expect("response" in result).toBe(true);
    if ("response" in result) {
      expect(result.response.status).toBe(400);
      expect((await result.response.json()).error).toBe("Invalid JSON");
    }
  });

  it("returns a 400 with the first issue message and issues for a schema mismatch", async () => {
    const result = await parseJsonBody(
      makeRequest(JSON.stringify({ name: "" })),
      schema,
    );
    expect("response" in result).toBe(true);
    if ("response" in result) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.error).toBe("Name is required");
      expect(body.issues).toBeDefined();
    }
  });
});
