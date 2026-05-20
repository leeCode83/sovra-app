import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { assessRisk, assessRiskFallback, type RiskAssessmentInput } from "@/lib/agents/venice-risk";

const defaultInput: RiskAssessmentInput = {
  activeDelegations: 0,
  requestedScope: "read_demographics",
  hasOverlapWithExisting: false,
  institutionVerified: true,
  durationDays: 30,
  requesterReputation: "verified",
  paymentAmount: "0.10",
};

describe("assessRiskFallback", () => {
  it("returns low risk when no overlap, verified, minimal scope", () => {
    const result = assessRiskFallback(defaultInput);
    expect(result.risk).toBe("low");
    expect(result.action).toBe("auto_approve");
  });

  it("returns medium risk when scope overlaps with existing delegation", () => {
    const result = assessRiskFallback({ ...defaultInput, hasOverlapWithExisting: true });
    expect(result.risk).toBe("medium");
    expect(result.action).toBe("escalate");
  });

  it("returns medium risk when scope is full_record", () => {
    const result = assessRiskFallback({ ...defaultInput, requestedScope: "full_record" });
    expect(result.risk).toBe("medium");
    expect(result.action).toBe("escalate");
  });

  it("returns high risk when institution is not verified", () => {
    const result = assessRiskFallback({ ...defaultInput, institutionVerified: false });
    expect(result.risk).toBe("high");
    expect(result.action).toBe("auto_reject");
  });

  it("returns high risk when reputation is unknown", () => {
    const result = assessRiskFallback({ ...defaultInput, requesterReputation: "unknown" });
    expect(result.risk).toBe("high");
    expect(result.action).toBe("auto_reject");
  });

  it("returns high risk when overlap AND unverified (high wins)", () => {
    const result = assessRiskFallback({
      ...defaultInput,
      hasOverlapWithExisting: true,
      institutionVerified: false,
    });
    expect(result.risk).toBe("high");
    expect(result.action).toBe("auto_reject");
  });

  it("has confidence 0.7 for all fallback results", () => {
    const result = assessRiskFallback(defaultInput);
    expect(result.confidence).toBe(0.7);
  });
});

describe("assessRisk with missing API key", () => {
  const origKey = process.env.VENICE_API_KEY;

  beforeEach(() => {
    delete process.env.VENICE_API_KEY;
  });

  afterAll(() => {
    if (origKey) process.env.VENICE_API_KEY = origKey;
  });

  it("falls back to fallback when VENICE_API_KEY is not set", async () => {
    const result = await assessRisk(defaultInput);
    expect(result.risk).toBe("low");
    expect(result.action).toBe("auto_approve");
    expect(result.confidence).toBe(0.7);
  });
});
