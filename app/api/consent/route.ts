import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { consents } from "@/lib/db/schema";
import { auth, requireRole } from "@/lib/auth/middleware";
import { createConsentSchema } from "@/lib/validators";
import { eq, and, isNull } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const user = await auth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const patientId = searchParams.get("patientId");
  const status = searchParams.get("status");

  const filters = [];
  if (patientId) filters.push(eq(consents.patientId, patientId));
  if (status) filters.push(eq(consents.status, status as "active" | "revoked" | "expired"));

  const rows = await db.select().from(consents).where(
    filters.length > 0 ? (filters.length === 1 ? filters[0] : and(...filters)) : isNull(consents.id)
  ).limit(100);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const roleCheck = await requireRole(req, "admin");
  if (roleCheck instanceof NextResponse) return roleCheck;

  const body = await req.json();
  const parsed = createConsentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.issues }, { status: 422 });
  }

  const insertValues = {
    patientId: parsed.data.patientId,
    researcherId: parsed.data.researcherId,
    scope: parsed.data.scope,
    dataScope: parsed.data.dataScope,
    expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
  };
  const [row] = await db.insert(consents).values(insertValues).returning();
  return NextResponse.json(row, { status: 201 });
}