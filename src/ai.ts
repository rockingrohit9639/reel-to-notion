import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { ReelData } from "./scraper";

export interface NotionReelEntry {
	title: string;
	description: string;
	tags: string[];
	author: string | null;
	url: string;
	source: string;
}

const reelSchema = z.object({
	title: z
		.string()
		.describe(
			"The specific subject or topic of the reel (max 60 chars). Extract the core thing being shown — a place name, dish name, product, technique, person, etc. For example: 'Santorini, Greece', 'Butter Chicken Recipe', 'iPhone 16 Pro Camera'. Never use generic titles like 'Travel Reel' or 'Amazing Recipe'. No emojis, no hashtags.",
		),
	description: z
		.string()
		.describe(
			"A 1-2 sentence factual takeaway from the reel (max 150 chars). Focus on the key information, tip, or insight — not what the reel shows. For example: 'Best visited in September for fewer crowds and warm weather' instead of 'A travel reel showcasing Santorini'.",
		),
	tags: z
		.array(z.string())
		.describe(
			"3-6 readable, lowercase, hyphen-separated tags categorizing the reel content (e.g. 'fitness', 'cooking', 'cinematic-lighting', 'editing-tips', 'tech-review'). No '#' prefix. Always use hyphens to separate words, never combine them.",
		),
});

export async function extractStructuredData(
	reelData: ReelData,
): Promise<NotionReelEntry | null> {
	const prompt = buildPrompt(reelData);

	try {
		const { output } = await generateText({
			model: google("gemini-2.5-flash"),
			output: Output.object({ schema: reelSchema }),
			prompt,
			temperature: 0.3,
		});

		if (!output) return null;

		return {
			title: output.title,
			description: output.description,
			tags: output.tags,
			author: reelData.authorName,
			url: reelData.url,
			source: "instagram-reel",
		};
	} catch (error) {
		console.error("Gemini extraction failed:", error);
		return null;
	}
}

function buildPrompt(reel: ReelData): string {
	const parts = [
		"You are processing an Instagram Reel to create a structured entry for a Notion database.",
		"Based on the following scraped data, extract a clean title, a very short description, and relevant tags.\n",
		`URL: ${reel.url}`,
		reel.caption ? `Caption: ${reel.caption}` : null,
		reel.title ? `Title: ${reel.title}` : null,
		reel.description ? `Description: ${reel.description}` : null,
		reel.authorName ? `Author: ${reel.authorName}` : null,
	];

	return parts.filter(Boolean).join("\n");
}
