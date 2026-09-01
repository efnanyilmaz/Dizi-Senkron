// Dailymotion'ın herkese açık Data API'si — YouTube'un aksine anahtar
// gerektirmiyor, günlük arama kotası da yok. Gömme izni (allow_embed) her
// video için ayrı belirtiliyor; kapalıysa aynı YouTube akışındaki gibi
// "harici link" moduna düşülür.
const DAILYMOTION_API_URL = "https://api.dailymotion.com";
const MIN_EPISODE_SECONDS = 40 * 60;

export function isEpisodeLength(durationSeconds: number): boolean {
  return durationSeconds >= MIN_EPISODE_SECONDS;
}

export type DailymotionSearchResult = {
  videoId: string;
  title: string;
  ownerName: string;
  thumbnailUrl: string | null;
};

export type DailymotionChannel = { ownerName: string };

type RawDailymotionItem = {
  id: string;
  title?: string;
  duration: number;
  allow_embed: boolean;
  thumbnail_url?: string;
  "owner.screenname"?: string;
};

function normalize(text: string) {
  return text.toLocaleLowerCase("tr-TR").replace(/[^\p{L}\p{N}]/gu, "");
}

const channelCache = new Map<string, DailymotionChannel | null>();

// Bir dizinin tam bölümlerini yükleyen Dailymotion hesabını bulur — YouTube
// tarafındaki findShowChannel ile aynı mantık: isim benzerliğine değil,
// gerçekten bölüm uzunluğunda ve gömülebilir en az iki video yükleyen
// hesaba bakılır.
export async function findDailymotionChannel(showTitle: string): Promise<DailymotionChannel | null> {
  const cacheKey = normalize(showTitle);
  if (channelCache.has(cacheKey)) return channelCache.get(cacheKey)!;

  const url = new URL(`${DAILYMOTION_API_URL}/videos`);
  url.searchParams.set("search", showTitle);
  url.searchParams.set("fields", "id,duration,allow_embed,owner.screenname");
  url.searchParams.set("limit", "25");

  const res = await fetch(url);
  if (!res.ok) {
    channelCache.set(cacheKey, null);
    return null;
  }
  const data = (await res.json()) as { list?: RawDailymotionItem[] };

  const counts = new Map<string, number>();
  for (const item of data.list ?? []) {
    const owner = item["owner.screenname"];
    if (!owner || !item.allow_embed || item.duration < MIN_EPISODE_SECONDS) continue;
    counts.set(owner, (counts.get(owner) ?? 0) + 1);
  }

  let best: { ownerName: string; count: number } | null = null;
  for (const [ownerName, count] of counts) {
    if (count < 2) continue;
    if (!best || count > best.count) best = { ownerName, count };
  }

  const result = best ? { ownerName: best.ownerName } : null;
  channelCache.set(cacheKey, result);
  return result;
}

export async function searchDailymotionVideos(
  query: string,
  ownerName?: string,
): Promise<DailymotionSearchResult[]> {
  const url = new URL(`${DAILYMOTION_API_URL}/videos`);
  url.searchParams.set("search", query);
  url.searchParams.set("fields", "id,title,duration,allow_embed,thumbnail_url,owner.screenname");
  url.searchParams.set("limit", "20");
  if (ownerName) url.searchParams.set("owners", ownerName);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Dailymotion araması başarısız oldu (${res.status}).`);
  }
  const data = (await res.json()) as { list?: RawDailymotionItem[] };

  return (data.list ?? [])
    .filter((item) => item.allow_embed && item.duration >= MIN_EPISODE_SECONDS)
    .slice(0, 8)
    .map((item) => ({
      videoId: item.id,
      title: item.title ?? "İsimsiz video",
      ownerName: item["owner.screenname"] ?? "Dailymotion",
      thumbnailUrl: item.thumbnail_url ?? null,
    }));
}

export type DailymotionVideoInfo = {
  videoId: string;
  title: string;
  durationSeconds: number;
  embeddable: boolean;
};

// Kullanıcı elle bir Dailymotion linki yapıştırdığında doğrulamak için.
export async function getDailymotionVideoInfo(videoId: string): Promise<DailymotionVideoInfo | null> {
  const url = new URL(`${DAILYMOTION_API_URL}/video/${videoId}`);
  url.searchParams.set("fields", "id,title,duration,allow_embed,status");

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as {
    error?: unknown;
    id?: string;
    title?: string;
    duration?: number;
    allow_embed?: boolean;
    status?: string;
  };
  if (data.error || !data.id || data.status !== "published") return null;

  return {
    videoId: data.id,
    title: data.title ?? "İsimsiz video",
    durationSeconds: data.duration ?? 0,
    embeddable: Boolean(data.allow_embed),
  };
}
