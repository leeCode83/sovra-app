import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { subInvestigatorAgent } from "@/lib/agents/sub-investigator";

const redeemSchema = z.object({
  delegationHash: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = redeemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const proof = await subInvestigatorAgent.redeemDelegation(parsed.data.delegationHash);

    return NextResponse.json({ success: true, proof }, { status: 200 });
  } catch (error) {
    console.error("[Sub-Investigator API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
