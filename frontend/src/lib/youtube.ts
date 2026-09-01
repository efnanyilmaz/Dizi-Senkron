export type YoutubeSearchResult = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string | null;
};

export type YoutubeChannel = {
  channelId: string;
  channelTitle: string;
};

// Video başlığından bölüm numarasını çıkarır — "7. Bölüm", "7.Bölüm",
// "Bölüm 7" gibi yaygın kalıpları yakalar.
export function parseEpisodeNumber(title: string): number | null {
  const afterNumber = /(\d+)\s*\.?\s*bölüm/i.exec(title);
  if (afterNumber) return Number(afterNumber[1]);

  const beforeNumber = /bölüm\s*(\d+)/i.exec(title);
  if (beforeNumber) return Number(beforeNumber[1]);

  return null;
}

export function extractYoutubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    if (url.hostname === "youtu.be") {
      return url.pathname.slice(1) || null;
    }
    if (url.hostname.includes("youtube.com")) {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      if (url.pathname.startsWith("/embed/")) return url.pathname.split("/embed/")[1] || null;
      if (url.pathname.startsWith("/shorts/")) return url.pathname.split("/shorts/")[1] || null;
    }
  } catch {
    return null;
  }

  return null;
}
