import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { consents } from "@/lib/db/schema";
import { auth } from "@/lib/auth/middleware";
import { updateConsentSchema } from "@/lib/validators";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const user = await auth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [row] = await db.select().from(consents).where(eq(consents.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await auth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateConsentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.issues }, { status: 422 });
  }

  const [row] = await db.select().from(consents).where(eq(consents.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [updated] = await db.update(consents)
    .set({ ...parsed.data })
    .where(eq(consents.id, id))
    .returning();
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const user = await auth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "patient" && user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const [row] = await db.select().from(consents).where(eq(consents.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [updated] = await db.update(consents)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(eq(consents.id, id))
    .returning();
  return NextResponse.json(updated);
}