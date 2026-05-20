import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { delegations } from "@/lib/db/schema";
import { auth } from "@/lib/auth/middleware";
import { updateDelegationSchema } from "@/lib/validators";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const user = await auth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [row] = await db.select().from(delegations).where(eq(delegations.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await auth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateDelegationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.issues }, { status: 422 });
  }

  const [row] = await db.select().from(delegations).where(eq(delegations.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [updated] = await db.update(delegations)
    .set({ ...parsed.data })
    .where(eq(delegations.id, id))
    .returning();
  return NextResponse.json(updated);
}