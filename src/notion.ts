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

// The Notion SDK v5 (API version 2025-09-03) removed databases.query in favor
// of dataSources.query, but that endpoint doesn't resolve database IDs. Using a
// direct fetch with the older API version (2022-06-28) which still supports
// the databases/{id}/query endpoint.
export async function findDuplicateByTitle(
	title: string,
): Promise<string | null> {
	const res = await fetch(
		`https://api.notion.com/v1/databases/${getTriageDbId()}/query`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${getNotionApiKey()}`,
				"Notion-Version": "2022-06-28",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				filter: {
					property: "Title",
					title: { equals: title },
				},
				page_size: 1,
			}),
		},
	);

	if (!res.ok) {
		console.error("Duplicate check failed:", await res.text());
		return null;
	}

	const data = (await res.json()) as { results: Array<{ id: string }> };
	if (data.results.length === 0) return null;

	const id = data.results[0].id.replace(/-/g, "");
	return `https://notion.so/${id}`;
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
