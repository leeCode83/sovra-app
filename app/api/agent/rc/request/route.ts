import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rcAgent } from "@/lib/agents/researcher-coordinator";
import type { ConsentRequestInput } from "@/lib/agents/types";

const rcRequestSchema = z.object({
  patientSmartAccount: z.string().startsWith("0x"),
  dataType: z.enum(["lab_only", "imaging_only", "full_record"]),
  durationDays: z.number().int().min(1).max(365),
  institutionAddress: z.string().startsWith("0x"),
  maxUses: z.number().int().min(0).default(0),
  paymentTxHash: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = rcRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const input: ConsentRequestInput = {
      patientSmartAccount: parsed.data.patientSmartAccount as `0x${string}`,
      dataType: parsed.data.dataType,
      durationDays: parsed.data.durationDays,
      institutionAddress: parsed.data.institutionAddress as `0x${string}`,
      maxUses: parsed.data.maxUses,
      paymentTxHash: parsed.data.paymentTxHash,
    };

    const result = await rcAgent.handleConsentRequest(input);

    if (result.status === "rejected") {
      return NextResponse.json(result, { status: 403 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[RC Agent API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
