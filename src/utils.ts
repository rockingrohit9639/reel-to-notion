export function extractReelInfo(text: string) {
	const match = text.match(/https?:\/\/(www\.)?instagram\.com\/reel\/([^/?]+)/);

	if (!match) return null;

	const reelId = match[2];

	const cleanUrl = `https://www.instagram.com/reel/${reelId}/`;

	return {
		reelId,
		cleanUrl,
	};
}
