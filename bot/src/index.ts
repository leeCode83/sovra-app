import { Bot, Context } from "grammy";
import { setBotInstance } from "@/lib/telegram/sender";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.warn("[Bot] TELEGRAM_BOT_TOKEN not set. Bot will not start.");
}

const bot = new Bot<Context>(BOT_TOKEN || "placeholder");

setBotInstance(bot);

bot.command("start", async (ctx) => {
  await ctx.reply(
    "🏥 Welcome to Sovra!\n\n" +
    "Your decentralized medical data consent manager.\n\n" +
    "Commands:\n" +
    "/status — View your active consents\n" +
    "/help — Show help message"
  );
});

bot.command("status", async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  await ctx.reply(
    `📊 **Your Status**\n\n` +
    `Telegram ID: ${telegramId}\n` +
    `Active Consents: Check back after onboarding\n\n` +
    `You'll receive notifications here when researchers request access to your data.`,
    { parse_mode: "Markdown" }
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    "Sovra helps you manage and monetize your medical data consent.\n\n" +
    "**Available commands:**\n" +
    "/start — Welcome message\n" +
    "/status — View your consents\n" +
    "/help — This help message\n\n" +
    "When a researcher requests your data, you'll get a notification with Approve/Reject buttons.",
    { parse_mode: "Markdown" }
  );
});

bot.callbackQuery(/consent:approve:(.+)/, async (ctx) => {
  const consentId = ctx.match[1];
  await ctx.answerCallbackQuery({ text: "Processing your approval..." });

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/agent/patient/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consentId, decision: "approved", telegramId: ctx.from?.id.toString() }),
    });

    if (response.ok) {
      const result = await response.json();
      await ctx.editMessageText(
        `✅ **Approved!**\n\nDelegation: \`${result.delegationHash || "pending"}\`\n\nYour consent has been granted.`,
        { parse_mode: "Markdown" }
      );
    } else {
      await ctx.editMessageText("❌ Failed to process approval. Please try again.");
    }
  } catch (error) {
    console.error("[Bot] Decision callback error:", error);
    await ctx.editMessageText("✅ Decision received. Processing...");
  }
});

bot.callbackQuery(/consent:reject:(.+)/, async (ctx) => {
  const consentId = ctx.match[1];
  await ctx.answerCallbackQuery({ text: "Processing your rejection..." });

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await fetch(`${baseUrl}/api/agent/patient/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consentId, decision: "rejected", telegramId: ctx.from?.id.toString() }),
    });

    await ctx.editMessageText("❌ **Rejected.**\n\nThe consent request has been declined.");
  } catch (error) {
    console.error("[Bot] Decision callback error:", error);
    await ctx.editMessageText("❌ Decision received. Processing...");
  }
});

bot.catch((err) => {
  console.error("[Bot] Error:", err);
});

if (BOT_TOKEN) {
  bot.start({
    onStart: () => console.log("[Bot] Telegram bot started!"),
  });
}

export default bot;
