import { Client } from "@notionhq/client";
import type { NotionReelEntry } from "./ai";

function getNotionApiKey(): string {
	const key = process.env.NOTION_API_KEY;
	if (!key) throw new Error("NOTION_API_KEY environment variable is not set");
	return key;
}

const notion = new Client({ auth: getNotionApiKey() });

function getTriageDbId(): string {
	const id = process.env.NOTION_TRIAGE_DB_ID;
	if (!id)
		throw new Error("NOTION_TRIAGE_DB_ID environment variable is not set");
	return id;
}

export async function addToTriage(entry: NotionReelEntry) {
	const response = await notion.pages.create({
		parent: { database_id: getTriageDbId() },
		properties: {
			Title: { title: [{ text: { content: entry.title } }] },
			Description: {
				rich_text: [{ text: { content: entry.description } }],
			},
			Tags: { multi_select: entry.tags.map((t) => ({ name: t })) },
			Author: {
				rich_text: [{ text: { content: entry.author ?? "Unknown" } }],
			},
			URL: { url: entry.url },
			Source: { select: { name: entry.source } },
		},
	});

	return {
		id: response.id,
		url: `https://notion.so/${response.id.replace(/-/g, "")}`,
	};
}
