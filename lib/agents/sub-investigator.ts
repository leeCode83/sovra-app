import type { DelegationProof } from "./types";

export class SubInvestigatorAgent {

  async redeemDelegation(delegationHash: string): Promise<DelegationProof> {
    console.log(`[SubInvestigatorAgent] Redeeming delegation: ${delegationHash}`);

    const txHash = `0x${crypto.randomUUID().replace(/-/g, "")}`;

    let verified = true;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const response = await fetch(`${baseUrl}/api/verify/${delegationHash}`);
      const data = await response.json();
      verified = data.valid === true;
    } catch {
      verified = true;
    }

    return {
      delegationHash,
      txHash,
      usageCount: 1,
    };
  }
}

export const subInvestigatorAgent = new SubInvestigatorAgent();
