import OpenAI from "openai";
import { redis } from "@/lib/redis";
import { createHash } from "crypto";

const venice = new OpenAI({
  apiKey: process.env.VENICE_API_KEY,
  baseURL: process.env.VENICE_BASE_URL || "https://api.venice.ai/api/v1",
});

export type RiskLevel = "low" | "medium" | "high";
export type RiskAction = "auto_approve" | "escalate" | "auto_reject";

export interface RiskAssessmentInput {
  activeDelegations: number;
  requestedScope: string;
  hasOverlapWithExisting: boolean;
  institutionVerified: boolean;
  durationDays: number;
  requesterReputation: "verified" | "unknown" | "new";
  paymentAmount: string;
}

export interface RiskAssessmentResult {
  risk: RiskLevel;
  reason: string;
  action: RiskAction;
  confidence: number;
}

export async function assessRisk(input: RiskAssessmentInput): Promise<RiskAssessmentResult> {
  if (!process.env.VENICE_API_KEY) {
    return assessRiskFallback(input);
  }

  const prompt = `You are a privacy-preserving risk assessment engine for medical data consent.
  
Assess the risk of granting consent based on the following metadata:
- Active delegations: ${input.activeDelegations}
- Requested scope: ${input.requestedScope}
- Overlap with existing delegations: ${input.hasOverlapWithExisting ? "Yes" : "No"}
- Institution verified: ${input.institutionVerified ? "Yes" : "No"}
- Duration: ${input.durationDays} days
- Requester reputation: ${input.requesterReputation}
- Payment amount: $${input.paymentAmount} USDC

Risk levels:
- LOW: No overlap, scope minimal, institution verified, duration reasonable
- MEDIUM: Partial overlap, sensitive scope (imaging/full_record), or unverified institution
- HIGH: Duplication, very broad scope, no verification, or suspicious patterns

Return JSON with: { "risk": "low|medium|high", "reason": "...", "action": "auto_approve|escalate|auto_reject", "confidence": 0.0-1.0 }`;

  const response = await (venice.chat.completions.create as (params: unknown) => Promise<{ choices: Array<{ message: { content: string } }> }>)({
    model: "venice-uncensored",
    messages: [
      { role: "system", content: "You are a risk assessment engine. Always respond with valid JSON." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content || '{"risk":"medium","reason":"Fallback","action":"escalate","confidence":0.5}';
  return JSON.parse(content) as RiskAssessmentResult;
}

export function assessRiskFallback(input: RiskAssessmentInput): RiskAssessmentResult {
  let risk: RiskLevel = "low";
  let action: RiskAction = "auto_approve";
  let reason = "Default assessment";

  if (input.hasOverlapWithExisting) {
    risk = "medium";
    action = "escalate";
    reason = "Scope overlaps with existing delegation";
  }

  if (input.requestedScope === "full_record" || input.requestedScope === "imaging_only") {
    risk = "medium";
    action = "escalate";
    reason = "Sensitive data scope requested";
  }

  if (!input.institutionVerified || input.requesterReputation === "unknown") {
    risk = "high";
    action = "auto_reject";
    reason = "Institution or requester not verified";
  }

  return { risk, reason, action, confidence: 0.7 };
}

interface ConsentRequestForVenice {
  scope: {
    dataType: string;
    durationDays: number;
  };
  payment: {
    amount: string;
  };
}

export async function assessRiskWithCache(input: RiskAssessmentInput): Promise<RiskAssessmentResult> {
  const cacheKey = `venice:assessment:${createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 16)}`;
  
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as RiskAssessmentResult;
    }
  } catch {
    // Redis miss or error — proceed to Venice
  }

  const result = await assessRisk(input);

  try {
    await redis.setex(cacheKey, 300, JSON.stringify(result)); // 5 min TTL
  } catch {
    // Redis write failure is non-critical
  }

  return result;
}

export async function buildVeniceInput(
  request: ConsentRequestForVenice,
  activeDelegations: number,
  hasOverlap: boolean,
  institutionVerified: boolean,
): Promise<RiskAssessmentInput> {
  return {
    activeDelegations,
    requestedScope: request.scope.dataType,
    hasOverlapWithExisting: hasOverlap,
    institutionVerified,
    durationDays: request.scope.durationDays,
    requesterReputation: "verified",
    paymentAmount: request.payment.amount,
  };
}