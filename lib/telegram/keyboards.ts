import { InlineKeyboard } from "grammy";

export function consentDecisionKeyboard(consentId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("✅ Approve", `consent:approve:${consentId}`)
    .text("❌ Reject", `consent:reject:${consentId}`);
}

export function consentStatusKeyboard(consentId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("📋 View Details", `consent:status:${consentId}`)
    .text("🔙 Back", "menu:back");
}
