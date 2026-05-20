import { describe, it, expect } from "vitest";
import {
  createConsentSchema,
  updateConsentSchema,
  createDelegationSchema,
  updateDelegationSchema,
  createPaymentSchema,
  settlePaymentSchema,
  uuidSchema,
} from "@/lib/validators";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";

describe("createConsentSchema", () => {
  it("accepts valid input", () => {
    const result = createConsentSchema.safeParse({
      patientId: validUuid,
      researcherId: validUuid,
      scope: "read_demographics",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid UUID", () => {
    const result = createConsentSchema.safeParse({
      patientId: "not-a-uuid",
      researcherId: validUuid,
      scope: "read_lab_results",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues?.length).toBeGreaterThan(0);
  });

  it("rejects invalid scope", () => {
    const result = createConsentSchema.safeParse({
      patientId: validUuid,
      researcherId: validUuid,
      scope: "invalid_scope",
    });
    expect(result.success).toBe(false);
  });

  it("accepts without optional fields", () => {
    const result = createConsentSchema.safeParse({
      patientId: validUuid,
      researcherId: validUuid,
      scope: "read_genomic",
    });
    expect(result.success).toBe(true);
  });

  it("accepts with datetime expiresAt", () => {
    const result = createConsentSchema.safeParse({
      patientId: validUuid,
      researcherId: validUuid,
      scope: "imaging_only",
      expiresAt: "2025-12-31T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });
});

describe("updateConsentSchema", () => {
  it("accepts valid status", () => {
    const result = updateConsentSchema.safeParse({ status: "revoked" });
    expect(result.success).toBe(true);
  });

  it("rejects unknown status", () => {
    const result = updateConsentSchema.safeParse({ status: "unknown" });
    expect(result.success).toBe(false);
  });
});

describe("createDelegationSchema", () => {
  it("accepts valid input", () => {
    const result = createDelegationSchema.safeParse({
      consentId: validUuid,
      fromDid: "did:ethr:0x123",
      toDid: "did:ethr:0x456",
      validUntil: "2025-12-31T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty DID", () => {
    const result = createDelegationSchema.safeParse({
      consentId: validUuid,
      fromDid: "",
      toDid: "did:ethr:0x456",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateDelegationSchema", () => {
  it("accepts valid status", () => {
    const result = updateDelegationSchema.safeParse({ status: "active" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = updateDelegationSchema.safeParse({ status: "invalid" });
    expect(result.success).toBe(false);
  });
});

describe("createPaymentSchema", () => {
  it("accepts valid amount 0.10", () => {
    const result = createPaymentSchema.safeParse({
      payerDid: "did:ethr:0x123",
      payeeDid: "did:ethr:0x456",
      amount: "0.10",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-numeric amount", () => {
    const result = createPaymentSchema.safeParse({
      payerDid: "did:ethr:0x123",
      payeeDid: "did:ethr:0x456",
      amount: "abc",
    });
    expect(result.success).toBe(false);
  });

  it("accepts up to 18 decimal places", () => {
    const result = createPaymentSchema.safeParse({
      payerDid: "did:ethr:0x123",
      payeeDid: "did:ethr:0x456",
      amount: "0.123456789012345678",
    });
    expect(result.success).toBe(true);
  });

  it("defaults currency to USDC", () => {
    const result = createPaymentSchema.safeParse({
      payerDid: "did:ethr:0x123",
      payeeDid: "did:ethr:0x456",
      amount: "1",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe("USDC");
    }
  });
});

describe("settlePaymentSchema", () => {
  it("rejects empty txHash", () => {
    const result = settlePaymentSchema.safeParse({ txHash: "" });
    expect(result.success).toBe(false);
  });

  it("accepts valid txHash", () => {
    const result = settlePaymentSchema.safeParse({ txHash: "0xabc123" });
    expect(result.success).toBe(true);
  });
});
