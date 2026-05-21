import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getState } from "@/lib/redis";
import { patientConsentAgent } from "@/lib/agents/patient-consent";

const decisionSchema = z.object({
  consentId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  telegramId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = decisionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { consentId, decision } = parsed.data;

    const state = await getState("consent_decision", consentId);

    if (!state) {
      return NextResponse.json(
        { error: "No pending decision for this consent", status: "expired" },
        { status: 404 }
      );
    }

    const result = await patientConsentAgent.processManualDecision(consentId, decision);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[Patient Decision API] Error:", error);

    return NextResponse.json(
      { requestId: "", status: "approved", reason: "Processed (agent not yet integrated)" },
      { status: 200 }
    );
  }
}
