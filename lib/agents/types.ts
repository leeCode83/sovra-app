import type { RiskLevel, RiskAction } from "./venice-risk";

export type ScopeDataType = "lab_only" | "imaging_only" | "full_record";

export interface ConsentRequest {
  requestId: string;
  rcAgentDid: string;
  patientSmartAccount: `0x${string}`;
  scope: {
    dataType: ScopeDataType;
    durationDays: number;
    institutionAddress: `0x${string}`;
    maxUses: number;
  };
  payment: {
    txHash: string;
    amount: string;
    currency: "USDC";
  };
  timestamp: string;
}

export type PatientDecision = "approved" | "rejected" | "timeout";

export interface PatientPreferences {
  autoApproveScopes: string[];
}

export interface ConsentRequestInput {
  patientSmartAccount: `0x${string}`;
  dataType: ScopeDataType;
  durationDays: number;
  institutionAddress: `0x${string}`;
  maxUses: number;
  paymentTxHash: string;
}

export interface AgentResponse {
  requestId: string;
  status: "approved" | "rejected" | "escalated";
  delegationHash?: string;
  reason?: string;
  riskAssessment?: {
    risk: RiskLevel;
    reason: string;
    action: RiskAction;
    confidence: number;
  };
}

export interface DelegationProof {
  delegationHash: string;
  txHash: string;
  usageCount: number;
}

export interface EscalateState {
  requestId: string;
  patientTelegramId: string;
  expiresAt: string;
  decision?: PatientDecision;
  consentId?: string;
}

export type { RiskAssessmentInput, RiskAssessmentResult } from "./venice-risk";
