import { NextRequest, NextResponse } from "next/server";
import { x402Config, createPaymentRequirements } from "@/lib/x402/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { consentRequestId } = body;

  if (!consentRequestId) {
    return NextResponse.json({ error: "consentRequestId required" }, { status: 400 });
  }

  const requirements = createPaymentRequirements(`/api/consent/${consentRequestId}`);
  const paymentRequiredHeader = Buffer.from(JSON.stringify(requirements)).toString("base64");

  return NextResponse.json(
    {
      error: "Payment required",
      message: "x402 payment required to process this request",
      paymentDetails: requirements,
      retryAfter: "Pay via x402 protocol and retry with X-Payment header",
    },
    {
      status: 402,
      headers: {
        "Payment-Required": paymentRequiredHeader,
        "Content-Type": "application/json",
      },
    },
  );
}