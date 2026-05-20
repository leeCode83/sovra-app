import { z } from "zod";

export const didSchema = z.string().min(1);
export const uuidSchema = z.uuid();

export const scopeTypeSchema = z.enum([
  "read_demographics",
  "read_lab_results",
  "read_genomic",
  "imaging_only",
  "full_record",
]);

export const consentStatusSchema = z.enum(["active", "revoked", "expired"]);
export const delegationStatusSchema = z.enum(["pending", "active", "revoked", "expired"]);
export const paymentStatusSchema = z.enum(["pending", "completed", "failed", "refunded"]);

export const createConsentSchema = z.object({
  patientId: uuidSchema,
  researcherId: uuidSchema,
  scope: scopeTypeSchema,
  dataScope: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const updateConsentSchema = z.object({
  status: consentStatusSchema,
  delegationHash: z.string().optional(),
});

export const createDelegationSchema = z.object({
  consentId: uuidSchema,
  fromDid: didSchema,
  toDid: didSchema,
  validUntil: z.string().datetime().optional(),
});

export const updateDelegationSchema = z.object({
  status: delegationStatusSchema,
});

export const createPaymentSchema = z.object({
  payerDid: didSchema,
  payeeDid: didSchema,
  amount: z.string().regex(/^\d+(\.\d{1,18})?$/),
  currency: z.string().default("USDC"),
  resourceId: z.string().optional(),
});

export const settlePaymentSchema = z.object({
  txHash: z.string().min(1),
});

export type CreateConsentInput = z.infer<typeof createConsentSchema>;
export type UpdateConsentInput = z.infer<typeof updateConsentSchema>;
export type CreateDelegationInput = z.infer<typeof createDelegationSchema>;
export type UpdateDelegationInput = z.infer<typeof updateDelegationSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type SettlePaymentInput = z.infer<typeof settlePaymentSchema>;