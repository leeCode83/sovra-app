import { SignJWT, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

export interface AuthUser {
  sub: string;
  did: string;
  role: "patient" | "researcher" | "admin";
}

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");
  return new TextEncoder().encode(secret);
};

export async function signToken(user: AuthUser): Promise<string> {
  return new SignJWT({ did: user.did, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .setSubject(user.sub)
    .sign(getSecret());
}

export async function auth(req: NextRequest): Promise<AuthUser | null> {
  const header = req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      sub: payload.sub as string,
      did: payload.did as string,
      role: payload.role as AuthUser["role"],
    };
  } catch {
    return null;
  }
}

export async function requireRole(
  req: NextRequest,
  ...roles: AuthUser["role"][]
): Promise<{ user: AuthUser } | NextResponse> {
  const user = await auth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!roles.includes(user.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return { user };
}