export interface ReelData {
	url: string;
	reelId: string;
	title: string | null;
	caption: string | null;
	description: string | null;
	authorName: string | null;
	authorUrl: string | null;
	videoUrl: string | null;
	embedHtml: string | null;
}

export async function scrapeReelData(
	reelUrl: string,
	reelId: string,
): Promise<ReelData> {
	const data: ReelData = {
		url: reelUrl,
		reelId,
		title: null,
		caption: null,
		description: null,
		authorName: null,
		authorUrl: null,
		videoUrl: null,
		embedHtml: null,
	};

	const [oembedResult, pageResult] = await Promise.allSettled([
		fetchOEmbed(reelUrl),
		fetchPageMeta(reelUrl),
	]);

	if (oembedResult.status === "fulfilled" && oembedResult.value) {
		const oembed = oembedResult.value;
		data.caption = oembed.title || null;
		data.title = oembed.title || null;
		data.authorName = oembed.author_name || null;
		data.authorUrl = oembed.author_url || null;
		data.embedHtml = oembed.html || null;
	}

	if (pageResult.status === "fulfilled" && pageResult.value) {
		const meta = pageResult.value;
		if (!data.title) data.title = meta.ogTitle;
		data.description = meta.ogDescription || meta.description;
		data.videoUrl = meta.ogVideo;
		if (!data.authorName && meta.ogTitle) {
			const match = meta.ogTitle.match(/^(.+?)\s+on\s+Instagram/i);
			if (match) data.authorName = match[1];
		}
	}

	return data;
}

interface OEmbedResponse {
	title?: string;
	author_name?: string;
	author_url?: string;
	html?: string;
}

async function fetchOEmbed(reelUrl: string): Promise<OEmbedResponse | null> {
	const url = `https://api.instagram.com/oembed/?url=${encodeURIComponent(reelUrl)}&omitscript=true`;
	const res = await fetch(url, {
		headers: { "User-Agent": "curl/8.0" },
	});

	if (!res.ok) {
		console.error(`oEmbed request failed: ${res.status} ${res.statusText}`);
		return null;
	}

	return res.json();
}

interface PageMeta {
	ogTitle: string | null;
	ogDescription: string | null;
	ogVideo: string | null;
	description: string | null;
}

async function fetchPageMeta(reelUrl: string): Promise<PageMeta | null> {
	const res = await fetch(reelUrl, {
		headers: {
			"User-Agent":
				"Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
			Accept: "text/html,application/xhtml+xml",
			"Accept-Language": "en-US,en;q=0.9",
		},
		redirect: "follow",
	});

	if (!res.ok) {
		console.error(`Page fetch failed: ${res.status} ${res.statusText}`);
		return null;
	}

	const html = await res.text();

	return {
		ogTitle: extractMetaContent(html, "og:title"),
		ogDescription: extractMetaContent(html, "og:description"),
		ogVideo:
			extractMetaContent(html, "og:video:secure_url") ||
			extractMetaContent(html, "og:video:url") ||
			extractMetaContent(html, "og:video"),
		description: extractMetaContent(html, "description"),
	};
}

function extractMetaContent(html: string, property: string): string | null {
	const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const pattern = new RegExp(
		`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*?)["']` +
			`|<meta[^>]+content=["']([^"']*?)["'][^>]+(?:property|name)=["']${escaped}["']`,
		"i",
	);
	const match = html.match(pattern);
	if (!match) return null;
	const raw = match[1] ?? match[2] ?? null;
	return raw ? decodeHTMLEntities(raw) : null;
}

function decodeHTMLEntities(text: string): string {
	return text
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&#x27;/g, "'")
		.replace(/&#x2F;/g, "/");
}
