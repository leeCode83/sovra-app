import { db } from "@/lib/db";
import { consents, delegations, users, payments } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";
import { assessRiskWithCache, buildVeniceInput, assessRiskFallback } from "./venice-risk";
import { setState, getState } from "@/lib/redis";
import type {
  ConsentRequest,
  RiskAssessmentResult,
  AgentResponse,
  EscalateState,
  PatientDecision,
  PatientPreferences,
} from "./types";

function generateId(): string {
  return crypto.randomUUID();
}

export class PatientConsentAgent {
  async handleRequest(request: ConsentRequest): Promise<AgentResponse> {
    const patientDid = request.patientSmartAccount;

    const prefs = await this.getPatientPreferences(patientDid);
    if (prefs.autoApproveScopes.includes(request.scope.dataType)) {
      console.log(`[PatientConsentAgent] Auto-approve: ${request.scope.dataType} matches patient prefs`);
      const delegationHash = await this.createDelegation(request);
      return {
        requestId: request.requestId,
        status: "approved",
        delegationHash,
        reason: "Auto-approved by patient preferences",
      };
    }

    const activeCount = await this.countActiveDelegations(patientDid);
    const hasOverlap = await this.hasScopeOverlap(patientDid, request.scope.dataType);

    let riskResult: RiskAssessmentResult;
    try {
      riskResult = await assessRiskWithCache(
        await buildVeniceInput(request as never, activeCount, hasOverlap, true)
      );
    } catch {
      riskResult = assessRiskFallback({
        activeDelegations: activeCount,
        requestedScope: request.scope.dataType,
        hasOverlapWithExisting: hasOverlap,
        institutionVerified: true,
        durationDays: request.scope.durationDays,
        requesterReputation: "verified",
        paymentAmount: request.payment.amount,
      });
    }

    const consentId = await this.saveConsent(request, riskResult);

    switch (riskResult.action) {
      case "auto_approve":
        return await this.approveRequest(request, consentId, riskResult);
      case "escalate":
        return await this.escalateToPatient(request, consentId, riskResult);
      case "auto_reject":
        return await this.rejectRequest(request, consentId, riskResult);
      default:
        return { requestId: request.requestId, status: "rejected", reason: "Unknown risk action" };
    }
  }

  private async getPatientPreferences(patientDid: string): Promise<PatientPreferences> {
    try {
      const rows = await db
        .select({ preferences: users.preferences })
        .from(users)
        .where(eq(users.did, patientDid))
        .limit(1);
      const raw = rows[0]?.preferences;
      if (raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).autoApproveScopes)) {
        return raw as unknown as PatientPreferences;
      }
    } catch {
      console.warn("[PatientConsentAgent] Failed to read preferences, using defaults");
    }
    return { autoApproveScopes: [] };
  }

  private async countActiveDelegations(patientDid: string): Promise<number> {
    try {
      const result = await db
        .select({ cnt: count() })
        .from(delegations)
        .where(and(eq(delegations.fromDid, patientDid), eq(delegations.status, "active")));
      return Number(result[0]?.cnt ?? 0);
    } catch {
      return 0;
    }
  }

  private async hasScopeOverlap(patientDid: string, scope: string): Promise<boolean> {
    try {
      const rows = await db
        .select({ scope: consents.scope })
        .from(consents)
        .where(and(eq(consents.status, "active"), eq(consents.scope, scope)));
      return rows.length > 0;
    } catch {
      return false;
    }
  }

  private async saveConsent(request: ConsentRequest, risk: RiskAssessmentResult): Promise<string> {
    const consentId = generateId();
    try {
      await db.insert(consents).values({
        id: consentId,
        patientId: request.patientSmartAccount as never,
        researcherId: request.rcAgentDid as never,
        scope: request.scope.dataType,
        status: "active",
        expiresAt: new Date(Date.now() + request.scope.durationDays * 86400000),
        riskAssessment: { risk: risk.risk, reason: risk.reason, action: risk.action, confidence: risk.confidence, assessedAt: new Date().toISOString() } as never,
      } as never);
    } catch (e) {
      console.error("[PatientConsentAgent] Failed to save consent:", e);
    }
    return consentId;
  }

  private async approveRequest(request: ConsentRequest, consentId: string, risk: RiskAssessmentResult): Promise<AgentResponse> {
    console.log(`[PatientConsentAgent] AUTO-APPROVE: request=${request.requestId}, risk=${risk.risk}`);
    const delegationHash = await this.createDelegation(request);

    try {
      await db.update(payments).set({ status: "completed", settledAt: new Date() } as never).where(eq(payments.txHash, request.payment.txHash));
    } catch {
      /* non-critical */
    }

    return {
      requestId: request.requestId,
      status: "approved",
      delegationHash,
      riskAssessment: { risk: risk.risk, reason: risk.reason, action: risk.action, confidence: risk.confidence },
    };
  }

  private async escalateToPatient(request: ConsentRequest, consentId: string, risk: RiskAssessmentResult): Promise<AgentResponse> {
    console.log(`[PatientConsentAgent] ESCALATE: request=${request.requestId}, risk=${risk.risk}`);

    const escalateState: EscalateState = {
      requestId: request.requestId,
      patientTelegramId: "",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      consentId,
    };
    await setState("consent_decision", consentId, "awaiting_decision", escalateState as unknown as Record<string, unknown>, 86400);

    return {
      requestId: request.requestId,
      status: "escalated",
      riskAssessment: { risk: risk.risk, reason: risk.reason, action: risk.action, confidence: risk.confidence },
    };
  }

  private async rejectRequest(request: ConsentRequest, consentId: string, risk: RiskAssessmentResult): Promise<AgentResponse> {
    console.log(`[PatientConsentAgent] AUTO-REJECT: request=${request.requestId}, risk=${risk.risk}`);

    try {
      await db.update(payments).set({ status: "refunded" } as never).where(eq(payments.txHash, request.payment.txHash));
    } catch {
      /* non-critical */
    }

    return {
      requestId: request.requestId,
      status: "rejected",
      reason: risk.reason,
      riskAssessment: { risk: risk.risk, reason: risk.reason, action: risk.action, confidence: risk.confidence },
    };
  }

  async processManualDecision(consentId: string, decision: PatientDecision): Promise<AgentResponse> {
    const state = await getState("consent_decision", consentId);
    if (!state) {
      return { requestId: "", status: "rejected", reason: "State expired or not found" };
    }

    const escalateState = state.context as unknown as EscalateState;

    if (decision === "approved") {
      const rows = await db.select().from(consents).where(eq(consents.id, consentId)).limit(1);
      if (rows.length === 0) {
        return { requestId: escalateState.requestId, status: "rejected", reason: "Consent not found" };
      }

      const c = rows[0];
      const request: ConsentRequest = {
        requestId: escalateState.requestId,
        rcAgentDid: c.researcherId,
        patientSmartAccount: c.patientId as `0x${string}`,
        scope: { dataType: c.scope as never, durationDays: 90, institutionAddress: "0x0000000000000000000000000000000000000000" as `0x${string}`, maxUses: 0 },
        payment: { txHash: "", amount: "0.10", currency: "USDC" },
        timestamp: c.createdAt?.toISOString() ?? new Date().toISOString(),
      };

      const delegationHash = await this.createDelegation(request);
      try {
        await db.update(consents).set({ delegationHash: delegationHash ?? undefined } as never).where(eq(consents.id, consentId));
      } catch {
        /* non-critical */
      }

      return { requestId: escalateState.requestId, status: "approved", delegationHash, reason: "Patient manually approved" };
    }

    try {
      await db.update(consents).set({ status: "revoked" } as never).where(eq(consents.id, consentId));
    } catch {
      /* non-critical */
    }

    return { requestId: escalateState.requestId, status: "rejected", reason: decision === "timeout" ? "Patient did not respond within 24 hours" : "Patient manually rejected" };
  }

  async createDelegation(request: ConsentRequest): Promise<string | undefined> {
    try {
      const delegationHash = `0x${generateId().replace(/-/g, "")}` as `0x${string}`;

      await db.insert(delegations).values({
        id: generateId(),
        consentId: "" as never,
        fromDid: request.patientSmartAccount,
        toDid: request.rcAgentDid,
        delegationTxHash: delegationHash,
        status: "active",
        rightsMask: 1,
        validUntil: new Date(Date.now() + request.scope.durationDays * 86400000),
      } as never);

      return delegationHash;
    } catch (e) {
      console.error("[PatientConsentAgent] Failed to create delegation:", e);
      return undefined;
    }
  }
}

export const patientConsentAgent = new PatientConsentAgent();
