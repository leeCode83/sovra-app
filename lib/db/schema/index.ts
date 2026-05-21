import { pgTable, uuid, text, timestamp, integer, json, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid().defaultRandom().primaryKey(),
  did: text("did").notNull().unique(),
  role: text("role").$type<"patient" | "researcher" | "admin">().notNull(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  preferences: json("preferences").$type<{ autoApproveScopes: string[] }>().$default(() => ({ autoApproveScopes: [] })),
});

export const consents = pgTable("consents", {
  id: uuid().defaultRandom().primaryKey(),
  patientId: uuid("patient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  researcherId: uuid("researcher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  scope: text("scope").notNull(),
  dataScope: text("data_scope"),
  status: text("status").$type<"active" | "revoked" | "expired">().default("active").notNull(),
  delegationHash: text("delegation_hash"),
  requestId: text("request_id"),
  riskAssessment: json("risk_assessment").$type<{ risk: string; reason: string; action: string; confidence: number; assessedAt?: string }>(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, (table) => [
  index("consents_patient_id_idx").on(table.patientId),
  index("consents_researcher_id_idx").on(table.researcherId),
  index("consents_status_idx").on(table.status),
  index("consents_request_id_idx").on(table.requestId),
]);

export const delegations = pgTable("delegations", {
  id: uuid().defaultRandom().primaryKey(),
  consentId: uuid("consent_id").notNull().references(() => consents.id, { onDelete: "cascade" }),
  fromDid: text("from_did").notNull(),
  toDid: text("to_did").notNull(),
  delegationTxHash: text("delegation_tx_hash"),
  rightsMask: integer("rights_mask").default(0).notNull(),
  status: text("status").$type<"pending" | "active" | "revoked" | "expired">().default("pending").notNull(),
  validFrom: timestamp("valid_from", { withTimezone: true }).defaultNow().notNull(),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("delegations_from_did_idx").on(table.fromDid),
  index("delegations_consent_id_idx").on(table.consentId),
]);

export const payments = pgTable("payments", {
  id: uuid().defaultRandom().primaryKey(),
  payerDid: text("payer_did").notNull(),
  payeeDid: text("payee_did").notNull(),
  amount: text("amount").notNull(),
  currency: text("currency").default("USDC").notNull(),
  txHash: text("tx_hash"),
  status: text("status").$type<"pending" | "completed" | "failed" | "refunded">().default("pending").notNull(),
  resourceId: text("resource_id"),
  x402Context: text("x402_context"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  settledAt: timestamp("settled_at", { withTimezone: true }),
}, (table) => [
  index("payments_payer_did_idx").on(table.payerDid),
  index("payments_status_idx").on(table.status),
]);

export const usersRelations = relations(users, ({ many }) => ({
  patientConsents: many(consents, { relationName: "patientConsents" }),
  researcherConsents: many(consents, { relationName: "researcherConsents" }),
}));

export const consentsRelations = relations(consents, ({ one, many }) => ({
  patient: one(users, {
    fields: [consents.patientId],
    references: [users.id],
    relationName: "patientConsents",
  }),
  researcher: one(users, {
    fields: [consents.researcherId],
    references: [users.id],
    relationName: "researcherConsents",
  }),
  delegations: many(delegations),
}));

export const delegationsRelations = relations(delegations, ({ one }) => ({
  consent: one(consents, {
    fields: [delegations.consentId],
    references: [consents.id],
  }),
}));

export const paymentsRelations = relations(payments, () => ({}));