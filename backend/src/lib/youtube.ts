import { env } from "./env.js";

const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3";

// Fragman/sahne/klip gibi kısa videoları eleyip yalnızca tam bölüm
// uzunluğundaki videoları bırakmak için kullanılan alt sınır.
const MIN_EPISODE_SECONDS = 40 * 60;

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

type RawSearchItem = {
  id: { videoId?: string; channelId?: string };
  snippet: {
    title: string;
    channelId?: string;
    channelTitle: string;
    thumbnails?: { medium?: { url: string }; default?: { url: string } };
  };
};

export class YoutubeQuotaError extends Error {}

function requireKey() {
  if (!env.youtubeApiKey) {
    throw new Error("YouTube arama şu an yapılandırılmamış.");
  }
  return env.youtubeApiKey;
}

// Gün bileşeni (ör. "P1407DT10H11M52S") normalde bölümlerde çıkmaz ama
// 7/24 canlı yayın gibi çok uzun videolarda görülebiliyor — eskiden bu
// biçim hiç eşleşmeyip süre sıfır sayılıyor, video "fragman gibi" reddediliyordu.
export function parseIsoDurationSeconds(iso: string): number {
  const match = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!match) return 0;
  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  const seconds = Number(match[4] ?? 0);
  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
}

type VideoMeta = { durationSeconds: number; embeddable: boolean };

// Video ID'lerinin süresini ve başka sitelerde oynatılabilir olup olmadığını
// (embeddable) tek istekte çeker — devre dışı bırakılmış videoları sonuçlardan
// önceden elemek için kullanılır.
async function fetchVideoMeta(videoIds: string[]): Promise<Map<string, VideoMeta>> {
  const meta = new Map<string, VideoMeta>();
  if (videoIds.length === 0) return meta;

  const key = requireKey();
  const url = new URL(`${YOUTUBE_API_URL}/videos`);
  url.searchParams.set("key", key);
  url.searchParams.set("id", videoIds.join(","));
  url.searchParams.set("part", "contentDetails,status");

  const res = await fetch(url);
  if (!res.ok) return meta;

  const data = (await res.json()) as {
    items: {
      id: string;
      contentDetails: { duration: string };
      status: { embeddable: boolean };
    }[];
  };
  for (const item of data.items) {
    meta.set(item.id, {
      durationSeconds: parseIsoDurationSeconds(item.contentDetails.duration),
      embeddable: item.status.embeddable,
    });
  }
  return meta;
}

export type YoutubeVideoInfo = {
  videoId: string;
  title: string;
  channelId: string;
  channelTitle: string;
  durationSeconds: number;
  embeddable: boolean;
};

// Tek bir videonun bilgilerini (kanal + süre + gömülebilirlik) getirir —
// kullanıcı link yapıştırdığında o videonun gerçekten bir bölüm olup olmadığını
// ve sitede oynatılabildiğini doğrulamak için.
export async function getVideoInfo(videoId: string): Promise<YoutubeVideoInfo | null> {
  const key = requireKey();
  const url = new URL(`${YOUTUBE_API_URL}/videos`);
  url.searchParams.set("key", key);
  url.searchParams.set("id", videoId);
  url.searchParams.set("part", "snippet,contentDetails,status");

  const res = await fetch(url);
  if (res.status === 429) {
    throw new YoutubeQuotaError("YouTube günlük arama sınırına ulaşıldı, birazdan tekrar dene.");
  }
  if (!res.ok) return null;

  const data = (await res.json()) as {
    items: {
      id: string;
      snippet: { title: string; channelId: string; channelTitle: string };
      contentDetails: { duration: string };
      status: { embeddable: boolean };
    }[];
  };
  const item = data.items[0];
  if (!item) return null;

  return {
    videoId: item.id,
    title: item.snippet.title,
    channelId: item.snippet.channelId,
    channelTitle: item.snippet.channelTitle,
    durationSeconds: parseIsoDurationSeconds(item.contentDetails.duration),
    embeddable: item.status.embeddable,
  };
}

export function isEpisodeLength(durationSeconds: number): boolean {
  return durationSeconds >= MIN_EPISODE_SECONDS;
}

// findShowChannel çağrı başına biraz değişken sonuçlar verebildiği (YouTube arama
// sıralaması tam deterministik değil) için, bir dizi için bulunan kanal süreç
// belleğinde önbelleğe alınır — hem tutarlılık hem kota tasarrufu sağlar.
const channelCache = new Map<string, YoutubeChannel | null>();

function normalize(text: string) {
  return text.toLocaleLowerCase("tr-TR").replace(/[^\p{L}\p{N}]/gu, "");
}

// Bir dizinin tam bölümlerini yükleyen kanalı bulur. İsim benzerliğine değil,
// gerçekten bölüm uzunluğunda (>=40dk) video yükleyen kanala bakılır — aksi halde
// fragman/klip yükleyen bir "fan" kanalı yanlışlıkla seçilebiliyordu.
//
// minYear (dizinin TMDB'deki ilk yayın yılı) verilirse arama o tarihten öncesine
// kapatılır — aksi halde aynı isimli ama alakasız, çok daha eski bir yapım (ör.
// aynı adı taşıyan yerel bir TV programı) "resmi kanal" sanılabiliyordu.
export async function findShowChannel(
  showTitle: string,
  minYear?: number | null,
): Promise<YoutubeChannel | null> {
  const cacheKey = `${normalize(showTitle)}::${minYear ?? ""}`;
  if (channelCache.has(cacheKey)) return channelCache.get(cacheKey)!;

  const key = requireKey();

  const url = new URL(`${YOUTUBE_API_URL}/search`);
  url.searchParams.set("key", key);
  url.searchParams.set("q", showTitle);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "25");
  url.searchParams.set("relevanceLanguage", "tr");
  // Yayın öncesi tanıtımlara biraz pay bırakmak için bir yıl geriye toleranslı.
  if (minYear) url.searchParams.set("publishedAfter", `${minYear - 1}-01-01T00:00:00Z`);

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as { items: RawSearchItem[] };
  const items = data.items.filter((item) => item.id?.videoId && item.snippet.channelId);
  const meta = await fetchVideoMeta(items.map((item) => item.id.videoId!));

  const counts = new Map<string, { title: string; count: number }>();
  for (const item of items) {
    const info = meta.get(item.id.videoId!);
    if (!info || info.durationSeconds < MIN_EPISODE_SECONDS || !info.embeddable) continue;
    const channelId = item.snippet.channelId!;
    const entry = counts.get(channelId);
    if (entry) entry.count += 1;
    else counts.set(channelId, { title: item.snippet.channelTitle, count: 1 });
  }

  // Tek bir uzun video (ör. bir talk-show'un o diziyi konu alan bölümü) yanlışlıkla
  // "resmi kanal" sanılmasın diye, en az iki ayrı tam-bölüm-uzunluğunda video
  // isteniyor — gerçek bir dizi kanalının imzası budur, tek seferlik bir video değil.
  let best: { channelId: string; title: string; count: number } | null = null;
  for (const [channelId, entry] of counts) {
    if (entry.count < 2) continue;
    if (!best || entry.count > best.count) best = { channelId, ...entry };
  }

  // Hiçbir kanaldan tam bölüm uzunluğunda video çıkmadıysa (ör. henüz YouTube'da
  // fazla içeriği olmayan yeni bir dizi), isim eşleşmesiyle bir kanal bulmayı dene
  // — hiç kilitlememekten daha iyi bir yaklaşım.
  const result = best
    ? { channelId: best.channelId, channelTitle: best.title }
    : await findChannelByName(showTitle);

  channelCache.set(cacheKey, result);
  return result;
}

async function findChannelByName(showTitle: string): Promise<YoutubeChannel | null> {
  const key = requireKey();
  const url = new URL(`${YOUTUBE_API_URL}/search`);
  url.searchParams.set("key", key);
  url.searchParams.set("q", showTitle);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "channel");
  url.searchParams.set("maxResults", "10");
  url.searchParams.set("relevanceLanguage", "tr");

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as { items: RawSearchItem[] };
  const candidates = data.items
    .filter((item) => item.id?.channelId)
    .map((item) => ({ channelId: item.id.channelId!, channelTitle: item.snippet.channelTitle }));

  const target = normalize(showTitle);
  const exact = candidates.find((c) => normalize(c.channelTitle) === target);
  const contains = candidates.find(
    (c) => normalize(c.channelTitle).includes(target) || target.includes(normalize(c.channelTitle)),
  );
  return exact ?? contains ?? null;
}

// search.list, YouTube'un günlük kotası en kısıtlı olan ucu (bu projede
// günde 100 çağrı) — videos.list (süre/embeddable kontrolü, tek video
// doğrulama) çok daha yüksek bir kotayı paylaşıyor ve ayrı tutuluyor. Aynı
// sorgu ikinci kez sorulunca yeniden YouTube'a gitmemek için sonuçlar süreç
// belleğinde önbelleğe alınır — kotayı asıl tüketen, demo/test sırasında aynı
// aramaların tekrar tekrar yapılması.
const SEARCH_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 saat
const searchCache = new Map<string, { results: YoutubeSearchResult[]; expiresAt: number }>();

export async function searchYoutubeVideos(
  query: string,
  channelId?: string,
): Promise<YoutubeSearchResult[]> {
  const cacheKey = `${normalize(query)}::${channelId ?? ""}`;
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.results;
  }

  const key = requireKey();

  const url = new URL(`${YOUTUBE_API_URL}/search`);
  url.searchParams.set("key", key);
  url.searchParams.set("q", query);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "20");
  url.searchParams.set("relevanceLanguage", "tr");
  url.searchParams.set("safeSearch", "strict");
  if (channelId) url.searchParams.set("channelId", channelId);

  const res = await fetch(url);
  if (res.status === 429) {
    throw new YoutubeQuotaError("YouTube günlük arama sınırına ulaşıldı, birazdan tekrar dene.");
  }
  if (!res.ok) {
    throw new Error(`YouTube araması başarısız oldu (${res.status}).`);
  }

  const data = (await res.json()) as { items: RawSearchItem[] };
  const items = data.items.filter((item) => item.id?.videoId);

  // Sonuçlar tam bölüm uzunluğuna (>=40dk) göre filtrelenir — fragman, sahne
  // klibi ve #shorts gibi kısa videolar elenir, sadece izlenebilir tam bölümler
  // kalır. Başka sitelerde oynatılması kapatılmış (gömülemez) videolar da
  // elenir — aksi halde seçilince oynatıcıda "video kullanılamıyor" hatası
  // çıkıyordu.
  const meta = await fetchVideoMeta(items.map((item) => item.id.videoId!));
  const filtered = items.filter((item) => {
    const info = meta.get(item.id.videoId!);
    return info && info.durationSeconds >= MIN_EPISODE_SECONDS && info.embeddable;
  });

  const results = filtered.slice(0, 8).map((item) => ({
    videoId: item.id.videoId!,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle,
    thumbnailUrl: item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url ?? null,
  }));

  searchCache.set(cacheKey, { results, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
  return results;
}
