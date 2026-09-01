export type DailymotionSearchResult = {
  videoId: string;
  title: string;
  ownerName: string;
  thumbnailUrl: string | null;
};

export type DailymotionChannel = { ownerName: string };

export function extractDailymotionVideoId(input: string): string | null {
  const trimmed = input.trim();

  try {
    const url = new URL(trimmed);
    if (url.hostname === "dai.ly") return url.pathname.slice(1) || null;
    if (url.hostname.includes("dailymotion.com")) {
      const match = /\/video\/([a-zA-Z0-9]+)/.exec(url.pathname);
      if (match) return match[1];
    }
  } catch {
    return null;
  }

  return null;
}
