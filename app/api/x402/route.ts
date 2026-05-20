import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { auth } from "@/lib/auth/middleware";

export async function POST(req: NextRequest) {
  const user = await auth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { txHash, amount, payerDid, resourceId } = body;

  if (!txHash || !amount) {
    return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
  }

  const [payment] = await db.insert(payments).values({
    payerDid,
    payeeDid: process.env.RESOURCE_WALLET_ADDRESS || "",
    amount: amount.toString(),
    currency: "USDC",
    txHash,
    status: "completed",
    resourceId,
    settledAt: new Date(),
  }).returning();

  return NextResponse.json({
    success: true,
    paymentId: payment.id,
    txHash,
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const txHash = searchParams.get("txHash");

  if (!txHash) {
    return NextResponse.json({ error: "txHash required" }, { status: 400 });
  }

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.txHash, txHash))
    .limit(1);

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: payment.status,
    amount: payment.amount,
    settledAt: payment.settledAt,
  });
}