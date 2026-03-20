import { Elysia, t } from "elysia";
import { extractStructuredData } from "./ai";
import { addToTriage, findDuplicateByTitle } from "./notion";
import { scrapeReelData } from "./scraper";
import {
	formatTriageFailure,
	formatTriageSuccess,
	sendTelegramMessage,
} from "./telegram";
import { extractReelInfo } from "./utils";

const app = new Elysia().get("/", () => "Hello Elysia").listen(3000);

app.post(
	"/webhook",
	async ({ body }) => {
		const chatId = body.message.chat.id;
		try {
			console.log("Received webhook");
			const reelInfo = extractReelInfo(body.message.text);
			if (!reelInfo) return { success: false, error: "No reel URL found" };

			console.log("Scraping reel data...");
			const reelData = await scrapeReelData(reelInfo.cleanUrl, reelInfo.reelId);

			console.log("Extracting structured data...");
			const structured = await extractStructuredData(reelData);
			if (!structured) return { success: false, error: "AI extraction failed" };

			console.log("Checking for duplicates...");
			const existingUrl = await findDuplicateByTitle(structured.title);
			if (existingUrl) {
				await sendTelegramMessage(
					chatId,
					`⚠️ "<b>${structured.title}</b>" is already in your Triage.\n\n<a href="${existingUrl}">Open existing entry</a>`,
				);
				return { success: false, error: "Duplicate title" };
			}

			console.log("Adding to Notion triage...");
			const notionPage = await addToTriage(structured);
			console.log("Added to Notion");

			await sendTelegramMessage(
				chatId,
				formatTriageSuccess(
					structured.title,
					structured.description,
					notionPage.url,
				),
			);

			return { success: true, data: structured, notionUrl: notionPage.url };
		} catch (error) {
			console.error("Webhook processing failed:", error);
			await sendTelegramMessage(
				chatId,
				formatTriageFailure(String(error)),
			).catch(() => {});
			return { success: false, error: String(error) };
		}
	},
	{
		body: t.Object({
			message: t.Object({
				text: t.String(),
				chat: t.Object({ id: t.Number() }),
			}),
		}),
	},
);

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
