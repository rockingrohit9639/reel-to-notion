import { Elysia, t } from "elysia";
import { extractStructuredData } from "./ai";
import { scrapeReelData } from "./scraper";
import { extractReelInfo } from "./utils";

const app = new Elysia().get("/", () => "Hello Elysia").listen(3000);

app.post(
	"/webhook",
	async ({ body }) => {
		try {
			console.log("Received webhook");
			const reelInfo = extractReelInfo(body.message.text);
			if (!reelInfo) return { success: false, error: "No reel URL found" };

			console.log("Scraping reel data...");
			const reelData = await scrapeReelData(reelInfo.cleanUrl, reelInfo.reelId);
			console.log("Scraped reel data:", reelData);

			console.log("Extracting structured data...");
			const structured = await extractStructuredData(reelData);
			if (!structured) return { success: false, error: "AI extraction failed" };
			console.log("Structured reel entry:", structured);

			return { success: true, data: structured };
		} catch (error) {
			console.error("Webhook processing failed:", error);
			return { success: false, error: String(error) };
		}
	},
	{
		body: t.Object({
			message: t.Object({ text: t.String() }),
		}),
	},
);

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
