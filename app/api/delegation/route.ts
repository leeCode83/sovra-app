import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { delegations } from "@/lib/db/schema";
import { auth } from "@/lib/auth/middleware";
import { createDelegationSchema } from "@/lib/validators";
import { eq, and, isNull } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const user = await auth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const fromDid = searchParams.get("fromDid");
  const status = searchParams.get("status");

  const filters = [];
  if (fromDid) filters.push(eq(delegations.fromDid, fromDid));
  if (status) filters.push(eq(delegations.status, status as "pending" | "active" | "revoked" | "expired"));

  const rows = await db.select().from(delegations).where(
    filters.length > 0 ? (filters.length === 1 ? filters[0] : and(...filters)) : isNull(delegations.id)
  ).limit(100);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = await auth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "researcher" && user.role !== "patient")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createDelegationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.issues }, { status: 422 });
  }

  const insertValues = {
    consentId: parsed.data.consentId,
    fromDid: parsed.data.fromDid,
    toDid: parsed.data.toDid,
    validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : undefined,
  };
  const [row] = await db.insert(delegations).values(insertValues).returning();
  return NextResponse.json(row, { status: 201 });
}