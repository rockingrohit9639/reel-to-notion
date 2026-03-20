import { Bot } from "grammy";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
	throw new Error("TELEGRAM_BOT_TOKEN environment variable must be set");
}

const bot = new Bot(BOT_TOKEN);

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

export async function sendTelegramMessage(chatId: number, text: string) {
	await bot.api.sendMessage(chatId, text, {
		parse_mode: "HTML",
		link_preview_options: { is_disabled: true },
	});
}

export function formatTriageSuccess(
	title: string,
	description: string,
	notionUrl: string,
): string {
	return [
		"✅ <b>Added to Triage</b>",
		"",
		`<b>${escapeHtml(title)}</b>`,
		escapeHtml(description),
		"",
		`<a href="${notionUrl}">Open in Notion</a>`,
	].join("\n");
}

export function formatTriageFailure(error: string): string {
	return `❌ <b>Failed to process reel</b>\n\n${escapeHtml(error)}`;
}
