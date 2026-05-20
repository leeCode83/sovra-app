import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { signToken, auth, requireRole, type AuthUser } from "@/lib/auth/middleware";

const testUser: AuthUser = {
  sub: "user-123",
  did: "did:ethr:0xabc",
  role: "patient",
};

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-key-for-unit-tests";
});

afterAll(() => {
  delete process.env.JWT_SECRET;
});

describe("signToken", () => {
  it("produces a valid JWT string", async () => {
    const token = await signToken(testUser);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  it("throws if JWT_SECRET is not set", async () => {
    const orig = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    await expect(signToken(testUser)).rejects.toThrow("JWT_SECRET not set");
    process.env.JWT_SECRET = orig;
  });
});

describe("auth", () => {
  it("returns AuthUser from valid Bearer token", async () => {
    const token = await signToken(testUser);
    const req = new NextRequest("http://localhost", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await auth(req);
    expect(result).not.toBeNull();
    expect(result!.sub).toBe(testUser.sub);
    expect(result!.did).toBe(testUser.did);
    expect(result!.role).toBe(testUser.role);
  });

  it("returns null when Authorization header is missing", async () => {
    const req = new NextRequest("http://localhost");
    const result = await auth(req);
    expect(result).toBeNull();
  });

  it("returns null for malformed Authorization header", async () => {
    const req = new NextRequest("http://localhost", {
      headers: { Authorization: "Invalid" },
    });
    const result = await auth(req);
    expect(result).toBeNull();
  });

  it("returns null for invalid token", async () => {
    const req = new NextRequest("http://localhost", {
      headers: { Authorization: "Bearer invalid.jwt.token" },
    });
    const result = await auth(req);
    expect(result).toBeNull();
  });
});

describe("requireRole", () => {
  it("returns { user } when role matches", async () => {
    const token = await signToken(testUser);
    const req = new NextRequest("http://localhost", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await requireRole(req, "patient");
    expect(!(result instanceof NextResponse)).toBe(true);
    if ("user" in result) {
      expect(result.user.sub).toBe(testUser.sub);
    }
  });

  it("returns 403 when role does not match", async () => {
    const token = await signToken(testUser);
    const req = new NextRequest("http://localhost", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await requireRole(req, "admin");
    expect(result).toBeInstanceOf(NextResponse);
    if (result instanceof NextResponse) {
      const body = await result.json();
      expect(body.error).toBe("Forbidden");
    }
  });

  it("returns 401 when no token", async () => {
    const req = new NextRequest("http://localhost");
    const result = await requireRole(req, "patient");
    expect(result).toBeInstanceOf(NextResponse);
    if (result instanceof NextResponse) {
      const body = await result.json();
      expect(body.error).toBe("Unauthorized");
    }
  });
});
