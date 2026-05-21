/**
 * Telegram notification sender for Patient Consent Agent.
 *
 * Phase 3 MVP: Uses grammY's Bot instance to send messages.
 * The bot instance is initialized in bot/src/index.ts and injected here.
 */
import type { InlineKeyboard } from "grammy";

let botInstance: unknown = null;

export function setBotInstance(bot: unknown) {
  botInstance = bot;
}

function getBot(): { api: { sendMessage: (chatId: string, text: string, opts?: Record<string, unknown>) => Promise<unknown> } } | null {
  return botInstance as { api: { sendMessage: (chatId: string, text: string, opts?: Record<string, unknown>) => Promise<unknown> } } | null;
}

export async function sendConsentRequestNotification(
  telegramId: string,
  requestId: string,
  researcherName: string,
  scope: string,
  amount: string,
  keyboard: InlineKeyboard
): Promise<boolean> {
  const bot = getBot();

  if (!bot) {
    console.log(`[TelegramSender] Bot not initialized. Would send to ${telegramId}: ${requestId}`);
    return false;
  }

  try {
    await bot.api.sendMessage(
      telegramId,
      `🔔 **New Consent Request**\n\n` +
        `Researcher: ${researcherName}\n` +
        `Scope: ${scope}\n` +
        `Amount: ${amount} USDC\n` +
        `Request ID: ${requestId}\n\n` +
        `Please approve or reject:`,
      {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      }
    );
    return true;
  } catch (error) {
    console.error("[TelegramSender] Failed to send message:", error);
    return false;
  }
}

export async function sendConsentStatusUpdate(
  telegramId: string,
  requestId: string,
  status: string,
  delegationHash?: string
): Promise<boolean> {
  const bot = getBot();

  if (!bot) {
    console.log(`[TelegramSender] Bot not initialized. Would notify ${telegramId}: ${status}`);
    return false;
  }

  try {
    let message =
      `📢 **Consent Update**\n\n` +
      `Request ID: ${requestId}\n` +
      `Status: ${status}\n`;

    if (delegationHash) {
      message += `Delegation: \`${delegationHash}\`\n`;
    }

    await bot.api.sendMessage(telegramId, message, {
      parse_mode: "Markdown",
    });
    return true;
  } catch (error) {
    console.error("[TelegramSender] Failed to send status:", error);
    return false;
  }
}
