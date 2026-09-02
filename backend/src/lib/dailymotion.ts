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

// ownerName: kullanıcıya gösterilen görünen ad ("Muhteşem Yüzyıl").
// ownerUsername: hesabın gerçek kullanıcı adı ("muhtesemyuzyil") — API'nin
// `owners` filtresi SADECE bunu kabul ediyor, görünen adı değil. İkisi genelde
// farklı (boşluk/büyük harf/Türkçe karakter), bu yüzden ayrı tutuluyorlar.
export type DailymotionChannel = { ownerName: string; ownerUsername: string };

type RawDailymotionItem = {
  id: string;
  title?: string;
  duration: number;
  allow_embed: boolean;
  thumbnail_url?: string;
  created_time?: number;
  "owner.screenname"?: string;
  "owner.username"?: string;
};

function normalize(text: string) {
  return text.toLocaleLowerCase("tr-TR").replace(/[^\p{L}\p{N}]/gu, "");
}

const channelCache = new Map<string, DailymotionChannel | null>();

// Bir dizinin tam bölümlerini yükleyen Dailymotion hesabını bulur. Hesap adı
// dizinin adını içermiyorsa hiç aday sayılmaz — video başlıkları doğru olsa
// bile ("Medcezir E24" yükleyen "MabzyMabz" gibi rastgele bir kullanıcı),
// hesap ismi güvenilir bir kaynağı garanti etmiyor. Kalanlar arasından da
// gerçekten bölüm uzunluğunda ve gömülebilir en az iki video yükleyen
// hesaba bakılır.
//
// minYear (dizinin TMDB'deki ilk yayın yılı) verilirse o tarihten öncesine
// ait videolar elenir — aksi halde aynı adı taşıyan ama alakasız, çok daha
// eski bir yapım (ör. aynı adı taşıyan yerel bir TV programı) "resmi hesap"
// sanılabiliyordu.
export async function findDailymotionChannel(
  showTitle: string,
  minYear?: number | null,
): Promise<DailymotionChannel | null> {
  const cacheKey = `${normalize(showTitle)}::${minYear ?? ""}`;
  if (channelCache.has(cacheKey)) return channelCache.get(cacheKey)!;

  const url = new URL(`${DAILYMOTION_API_URL}/videos`);
  url.searchParams.set("search", showTitle);
  url.searchParams.set("fields", "id,duration,allow_embed,owner.screenname,owner.username,created_time");
  url.searchParams.set("limit", "25");
  // Yayın öncesi tanıtımlara biraz pay bırakmak için bir yıl geriye toleranslı.
  if (minYear) url.searchParams.set("created_after", `${minYear - 1}-01-01`);

  const res = await fetch(url);
  if (!res.ok) {
    channelCache.set(cacheKey, null);
    return null;
  }
  const data = (await res.json()) as { list?: RawDailymotionItem[] };
  // created_after API parametresine güvenmek yerine (dokümantasyonu belirsiz),
  // tarihi burada da elle doğruluyoruz — garanti çalışan taraf bu.
  const minTimestamp = minYear ? Date.UTC(minYear - 1, 0, 1) / 1000 : null;

  // Hesap adı dizinin adıyla hiç ilgisi olmayan bir kullanıcıysa (ör.
  // "MabzyMabz"), yüklediği videoların başlığı doğru bile olsa hesabı
  // "resmi/güvenilir kaynak" saymıyoruz — rastgele bir kullanıcının doğru
  // isimlendirdiği videolar, gelecekte aynı hesaba alakasız içerik de
  // yüklenebileceği garantisi vermiyor.
  const normalizedTitle = normalize(showTitle);
  const counts = new Map<string, { username: string; count: number }>();
  for (const item of data.list ?? []) {
    const owner = item["owner.screenname"];
    const username = item["owner.username"];
    if (!owner || !username || !item.allow_embed || item.duration < MIN_EPISODE_SECONDS) continue;
    if (minTimestamp && item.created_time && item.created_time < minTimestamp) continue;
    if (!normalize(owner).includes(normalizedTitle)) continue;
    const entry = counts.get(owner);
    if (entry) entry.count += 1;
    else counts.set(owner, { username, count: 1 });
  }

  let best: { ownerName: string; username: string; count: number } | null = null;
  for (const [ownerName, entry] of counts) {
    if (entry.count < 2) continue;
    if (!best || entry.count > best.count) best = { ownerName, ...entry };
  }

  const result = best ? { ownerName: best.ownerName, ownerUsername: best.username } : null;
  channelCache.set(cacheKey, result);
  return result;
}

export async function searchDailymotionVideos(
  query: string,
  ownerUsername?: string,
): Promise<DailymotionSearchResult[]> {
  const url = new URL(`${DAILYMOTION_API_URL}/videos`);
  url.searchParams.set("search", query);
  url.searchParams.set("fields", "id,title,duration,allow_embed,thumbnail_url,owner.screenname");
  url.searchParams.set("limit", "20");
  // `owners` filtresi kullanıcı adını (screenname değil) bekliyor.
  if (ownerUsername) url.searchParams.set("owners", ownerUsername);

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
