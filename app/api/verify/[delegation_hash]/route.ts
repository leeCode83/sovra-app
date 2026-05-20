import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { delegations, consents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getConsentStatus, getDelegationUsage, CONSENT_ENFORCER_ABI } from "@/lib/blockchain/contracts/consent-enforcer";
import { assessRisk, assessRiskFallback } from "@/lib/agents/venice-risk";
import { publicClient } from "@/lib/oneshot/relay";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ delegation_hash: string }> },
) {
  const { delegation_hash } = await params;
  const delegationHash = delegation_hash as `0x${string}`;

  if (!delegationHash.startsWith("0x") || delegationHash.length !== 66) {
    return NextResponse.json(
      { error: "Invalid delegation hash format" },
      { status: 400 },
    );
  }

  let onChainStatus: { isRevoked: boolean; isValid: boolean; usageCount?: bigint } = {
    isRevoked: false,
    isValid: false,
  };

  try {
    const [isRevokedResult, isValidResult, usageCount] = await Promise.all([
      getConsentStatus(delegationHash),
      publicClient.readContract({
        address: process.env.CONSENT_ENFORCER_ADDRESS as `0x${string}`,
        abi: CONSENT_ENFORCER_ABI,
        functionName: "isValid",
        args: [delegationHash],
      }).catch(() => false as const),
      getDelegationUsage(delegationHash).catch(() => BigInt(0)),
    ]);

    onChainStatus = {
      isRevoked: (isRevokedResult as { isRevoked: boolean })?.isRevoked ?? false,
      isValid: (isValidResult as boolean) ?? false,
      usageCount: usageCount as bigint,
    };
  } catch (error) {
    console.error("On-chain verification failed:", error);
  }

  const [dbRecord] = await db
    .select()
    .from(delegations)
    .where(eq(delegations.delegationTxHash, delegationHash))
    .limit(1);

  const riskAssessment = await (async () => {
    if (dbRecord) {
      const [consent] = await db
        .select()
        .from(consents)
        .where(eq(consents.id, dbRecord.consentId))
        .limit(1);

      if (consent) {
        const durationDays = consent.expiresAt
          ? Math.ceil((new Date(consent.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : 90;

        const input = {
          activeDelegations: 1,
          requestedScope: consent.scope || "read_lab_results",
          hasOverlapWithExisting: false,
          institutionVerified: true,
          durationDays,
          requesterReputation: "verified" as const,
          paymentAmount: "0.10",
        };

        try {
          return await assessRisk(input);
        } catch {
          return assessRiskFallback(input);
        }
      }
    }
    return assessRiskFallback({
      activeDelegations: 1,
      requestedScope: "read_lab_results",
      hasOverlapWithExisting: false,
      institutionVerified: true,
      durationDays: 90,
      requesterReputation: "verified" as const,
      paymentAmount: "0.10",
    });
  })();

  let status: "active" | "revoked" | "expired" = "active";
  if (onChainStatus.isRevoked || dbRecord?.status === "revoked") {
    status = "revoked";
  } else if (dbRecord?.status === "expired" || onChainStatus.isValid === false) {
    status = "expired";
  }

  return NextResponse.json({
    valid: !onChainStatus.isRevoked && onChainStatus.isValid !== false,
    status,
    delegationHash,
    onChain: {
      revoked: onChainStatus.isRevoked,
      usageCount: onChainStatus.usageCount?.toString() || "0",
      isValid: onChainStatus.isValid,
    },
    database: dbRecord ? {
      fromDid: dbRecord.fromDid,
      toDid: dbRecord.toDid,
      status: dbRecord.status,
      validUntil: dbRecord.validUntil,
    } : null,
    riskAssessment,
    verifiedAt: new Date().toISOString(),
  });
}