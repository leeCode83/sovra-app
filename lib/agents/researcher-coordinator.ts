import { db } from "@/lib/db";
import { consents, payments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type {
  ConsentRequest,
  ConsentRequestInput,
  AgentResponse,
  DelegationProof,
} from "./types";

function generateId(): string {
  return crypto.randomUUID();
}

export class ResearchCoordinatorAgent {

  async handleConsentRequest(input: ConsentRequestInput): Promise<AgentResponse> {
    const requestId = generateId();

    const request: ConsentRequest = {
      requestId,
      rcAgentDid: "",
      patientSmartAccount: input.patientSmartAccount,
      scope: {
        dataType: input.dataType,
        durationDays: input.durationDays,
        institutionAddress: input.institutionAddress,
        maxUses: input.maxUses,
      },
      payment: {
        txHash: input.paymentTxHash,
        amount: "0.10",
        currency: "USDC",
      },
      timestamp: new Date().toISOString(),
    };

    try {
      await db.insert(payments).values({
        id: generateId(),
        payerDid: "",
        payeeDid: input.patientSmartAccount,
        amount: "0.10",
        currency: "USDC",
        txHash: input.paymentTxHash,
        status: "pending",
        resourceId: requestId,
      } as any);
    } catch (e) {
      console.error("[RCAgent] Failed to save payment:", e);
    }

    const { patientConsentAgent } = await import("./patient-consent");

    console.log(`[RCAgent] Sending consent request to Patient Agent: ${requestId}`);

    const result = await patientConsentAgent.handleRequest(request);

    console.log(`[RCAgent] Patient Agent responded: status=${result.status}, requestId=${requestId}`);

    return result;
  }

  async spawnSubInvestigator(delegationHash: string): Promise<DelegationProof | null> {
    const { subInvestigatorAgent } = await import("./sub-investigator");

    const proof = await subInvestigatorAgent.redeemDelegation(delegationHash);

    console.log(`[RCAgent] Spawned Sub-Investigator Agent for delegation: ${delegationHash}`);

    return proof;
  }
}

export const rcAgent = new ResearchCoordinatorAgent();
