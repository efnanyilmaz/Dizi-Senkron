import { env } from "./env.js";

const TMDB_API_URL = "https://api.themoviedb.org/3";

export type TmdbShow = {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number | null;
  firstAirYear: number | null;
};

type RawTvResult = {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  first_air_date: string;
  origin_country?: string[];
  genre_ids?: number[];
  popularity?: number;
  original_language?: string;
  networks?: { id: number; name: string }[];
};

function normalize(result: RawTvResult): TmdbShow {
  return {
    tmdbId: result.id,
    title: result.name,
    posterPath: result.poster_path,
    backdropPath: result.backdrop_path,
    voteAverage: result.vote_average || null,
    firstAirYear: result.first_air_date ? Number(result.first_air_date.slice(0, 4)) : null,
  };
}

// Uygulama içindeki "Birlikte izle" özelliği YouTube'a bağlı olduğu için,
// bölümlerini resmi YouTube kanallarında bulma ihtimali yüksek olan yerli
// yapımlar dışındaki içerikler arama ve keşif listelerinde gösterilmiyor.
const isTurkishOrigin = (result: RawTvResult) => (result.origin_country ?? []).includes("TR");

// TR menşeli görünse de orijinal dili Türkçe olmayan (Arapça, Farsça vb.
// ortak yapımlar) içerikler "Türk dizisi" sayılmıyor.
const isTurkishLanguage = (result: RawTvResult) => result.original_language === "tr";

// Kara liste yerine beyaz liste: keşif listesinde sadece bu ana yayın
// kanallarından en az birinde yayınlanmış yapımlar gösterilir. Dijital
// platformlar (Exxen, BluTV, Netflix, Bi Kanal vb.), yabancı ortak yapımlar
// ve platform bilgisi eksik/duyurusu yapılmamış diziler bu şekilde tek
// tek kovalamak yerine otomatik elenir.
const ALLOWED_BROADCAST_NETWORK_IDS = new Set([
  439, // Kanal D
  36, // atv
  750, // Show TV
  778, // Star TV
  869, // TRT 1
  2702, // TV8
  303, // FOX
  7380, // NOW
]);

// Yarışma, talk show, haber ve belgesel gibi kurgusal olmayan formatlar
// "dizi" sayılmıyor — keşif listesinde sadece senaryolu diziler kalsın diye.
function isOnAllowedNetwork(detail: RawTvResult | null): boolean {
  const networks = detail?.networks ?? [];
  return networks.some((n) => ALLOWED_BROADCAST_NETWORK_IDS.has(n.id));
}

const NON_SERIES_GENRE_IDS = new Set([10764, 10767, 10763, 99]); // Reality, Talk, News, Documentary
const isScriptedSeries = (result: RawTvResult) =>
  !(result.genre_ids ?? []).some((id) => NON_SERIES_GENRE_IDS.has(id));

// Dizi arama — sadece ALLOWED_BROADCAST_NETWORK_IDS'teki ana yayın
// kanallarında yayınlanmış, senaryolu Türk dizileri döner. Hem keşfet
// sayfasının arama kutusu hem de grup oluştururken kullanılır.
export async function searchCuratedShows(query: string): Promise<TmdbShow[]> {
  const url = new URL(`${TMDB_API_URL}/search/tv`);
  url.searchParams.set("api_key", env.tmdbApiKey);
  url.searchParams.set("query", query);
  url.searchParams.set("language", "tr-TR");

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`TMDB araması başarısız oldu (${res.status}).`);
  }

  const data = (await res.json()) as { results: RawTvResult[] };
  const candidates = data.results
    .filter(isTurkishOrigin)
    .filter(isTurkishLanguage)
    .filter(isScriptedSeries)
    .filter((r) => r.poster_path)
    .filter((r) => !DISCOVER_EXCLUDED_IDS.has(r.id))
    .slice(0, 12);

  const candidateDetails = await Promise.all(candidates.map((c) => getShowById(c.id)));
  return candidates
    .filter((_, i) => isOnAllowedNetwork(candidateDetails[i]))
    .map(normalize);
}

function discoverTurkishDramaUrl(extraParams?: Record<string, string>) {
  const url = new URL(`${TMDB_API_URL}/discover/tv`);
  url.searchParams.set("api_key", env.tmdbApiKey);
  url.searchParams.set("language", "tr-TR");
  url.searchParams.set("with_origin_country", "TR");
  url.searchParams.set("with_genres", "18"); // Drama — oyun/yarışma/talk show formatlarını dışarıda bırakır
  url.searchParams.set("sort_by", "popularity.desc");
  for (const [key, value] of Object.entries(extraParams ?? {})) url.searchParams.set(key, value);
  return url;
}

async function discoverResults(url: URL): Promise<RawTvResult[]> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`TMDB trend listesi alınamadı (${res.status}).`);
  }
  const data = (await res.json()) as { results: RawTvResult[] };
  return data.results;
}

export type NextEpisodeInfo = {
  airDate: string;
  seasonNumber: number;
  episodeNumber: number;
  name: string | null;
};

export type TmdbShowDetail = TmdbShow & {
  overview: string;
  genres: string[];
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  cast: { name: string; character: string; profilePath: string | null }[];
  // Dizi hâlâ yayındaysa TMDB'nin bildiği sıradaki bölüm — yoksa (dizi
  // bitmiş/iptal olmuş ya da henüz planlanmamışsa) null.
  nextEpisode: NextEpisodeInfo | null;
};

export async function getShowDetails(tmdbId: number): Promise<TmdbShowDetail | null> {
  const url = new URL(`${TMDB_API_URL}/tv/${tmdbId}`);
  url.searchParams.set("api_key", env.tmdbApiKey);
  url.searchParams.set("language", "tr-TR");
  url.searchParams.set("append_to_response", "credits");

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as RawTvResult & {
    overview: string;
    genres?: { name: string }[];
    number_of_seasons?: number;
    number_of_episodes?: number;
    credits?: { cast?: { name: string; character: string; profile_path: string | null }[] };
    next_episode_to_air?: {
      air_date: string | null;
      season_number: number;
      episode_number: number;
      name: string | null;
    } | null;
  };

  const next = data.next_episode_to_air;

  return {
    ...normalize(data),
    overview: data.overview || "Bu dizi için henüz bir özet bulunmuyor.",
    genres: (data.genres ?? []).map((g) => g.name),
    numberOfSeasons: data.number_of_seasons ?? null,
    numberOfEpisodes: data.number_of_episodes ?? null,
    cast: (data.credits?.cast ?? []).slice(0, 6).map((c) => ({
      name: c.name,
      character: c.character,
      profilePath: c.profile_path,
    })),
    nextEpisode:
      next && next.air_date
        ? {
            airDate: next.air_date,
            seasonNumber: next.season_number,
            episodeNumber: next.episode_number,
            name: next.name,
          }
        : null,
  };
}

// Sistemli filtrelerin (menşei/dil/tür/platform) yakalayamadığı, elle
// çıkarılması istenen tekil yapımlar.
const DISCOVER_EXCLUDED_IDS = new Set([
  327535, // Harman Yeri
]);

export type TmdbGenre = { id: number; name: string };

// Türk yapımlarında fiilen görülen türlerle sınırlı tutuluyor — TMDB'nin tam
// tür listesi (savaş, belgesel vb.) burada büyük ölçüde alakasız kalıyor.
const RELEVANT_GENRE_IDS = new Set([18, 35, 10759, 9648, 10765, 80, 10751, 10766]);

// TMDB'nin tr-TR çevirisi 10766'yı ("Soap") "Pembe Dizi" diye adlandırıyor,
// ama bu etiket günlük dizi izlenimi veriyor — oysa bu tür altında haftalık
// prime-time romantik dramlar (ör. Erkenci Kuş, Adını Sen Koy) da çıkıyor.
// TMDB'de yayın sıklığını ayıran bir alan olmadığından, yanlış beklenti
// yaratmaması için etiketi içeriği daha doğru tanımlayan bir adla değiştiriyoruz.
const GENRE_NAME_OVERRIDES = new Map<number, string>([[10766, "Romantik Dram"]]);

let genreCache: TmdbGenre[] | null = null;

export async function getTvGenres(): Promise<TmdbGenre[]> {
  if (genreCache) return genreCache;

  const url = new URL(`${TMDB_API_URL}/genre/tv/list`);
  url.searchParams.set("api_key", env.tmdbApiKey);
  url.searchParams.set("language", "tr-TR");

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`TMDB tür listesi alınamadı (${res.status}).`);
  }
  const data = (await res.json()) as { genres: TmdbGenre[] };
  genreCache = data.genres
    .filter((g) => RELEVANT_GENRE_IDS.has(g.id))
    .map((g) => ({ ...g, name: GENRE_NAME_OVERRIDES.get(g.id) ?? g.name }));
  return genreCache;
}

const DISCOVER_PAGE_SIZE = 20;

// Herkesin bildiği klasikler — "Tümü" görünümünün ilk sayfasında en başa
// sabitlenir, aksi halde tarihe göre sıralamada eskiye düşüp kaybolurlardı.
// Sıra burada elle kürasyon edilir (TMDB popülerlik puanına göre otomatik
// sıralanmaz) — dizi başlarına göre serbestçe yeniden düzenlenebilir.
const CLASSIC_PINNED_IDS = [
  // En öne istenen sıra:
  61867, // Medcezir
  34899, // Muhteşem Yüzyıl
  64535, // Eşkıya Dünyaya Hükümdar Olmaz
  32519, // Ezel
  17635, // Aşk-ı Memnu
  85545, // Halka
  68388, // İçerde
  65556, // Çalıkuşu
  219446, // Aile
  110562, // Sadakatsiz
  236215, // Şahane Hayatım
  65555, // Kara Sevda
  // Geri kalanlar:
  74823, // Çukur
  210865, // Yalı Çapkını
  87572, // Kaçak Gelinler
  119806, // Teşkilat
  40417, // Leyla ile Mecnun
  62630, // Aşk Yeniden
  76835, // Ulan İstanbul
  104877, // Sen Çal Kapımı
  63549, // Kiralık Aşk
  65163, // Poyraz Karayel
  42099, // Kuzey Güney
  15576, // Yabancı Damat
  66088, // Hayat Şarkısı
  89671, // Afili Aşk
  48619, // Doktorlar
  87175, // Bir Aşk Hikayesi
  127588, // Aşk Mantık İntikam
  125527, // Baht Oyunu
  52645, // Yasak Elma
  205588, // Duy Beni
  96342, // Hekimoğlu
  115464, // Son Yaz
  222799, // Kraliçe
  48513, // Küçük Sırlar
  71096, // Söz
  49933, // Ruhun Duymaz
  305996, // Rüya Gibi
  92630, // Sana Bir Sır Vereceğim
  203572, // Senden Daha Güzel
  74660, // Ufak Tefek Cinayetler
  88024, // Zalim İstanbul
  64164, // Güneşin Kızları
  62553, // Kurt Seyit ve Şura
  262936, // Kalpazan
  76560, // Fazilet Hanım ve Kızları
];

// Beyaz liste filtresi her TMDB sayfasındaki (20 sonuç) çoğunu eleyebiliyor
// — bu yüzden "cursor" burada bir TMDB sayfa numarası değil, "bir sonraki
// TMDB sayfasından devam et" anlamına gelen bir işaretçi. Dolu bir grup
// (DISCOVER_PAGE_SIZE) toplanana ya da TMDB sayfaları bitene kadar arka
// arkaya birden çok TMDB sayfası çekilir; sonuç sayısının her seferinde
// tutarlı görünmesi için.
const MAX_TMDB_PAGES_PER_REQUEST = 6;

export async function discoverShows(
  genreId: number | null,
  cursor: number,
): Promise<{ results: TmdbShow[]; hasMore: boolean; nextCursor: number }> {
  let results: TmdbShow[] = [];
  let tmdbPage = cursor;
  let totalPages = tmdbPage;
  let pagesFetched = 0;

  while (results.length < DISCOVER_PAGE_SIZE && tmdbPage <= totalPages && pagesFetched < MAX_TMDB_PAGES_PER_REQUEST) {
    const url = discoverTurkishDramaUrl({ page: String(tmdbPage) });
    // En yeni yayınlanan yapımlar başa gelsin.
    url.searchParams.set("sort_by", "first_air_date.desc");
    if (genreId) {
      url.searchParams.set("with_genres", String(genreId));
    }

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`TMDB keşif listesi alınamadı (${res.status}).`);
    }
    const data = (await res.json()) as { results: RawTvResult[]; total_pages: number };
    totalPages = Math.min(data.total_pages, 25); // TMDB 500 sayfa sınırını makul tutuyor
    pagesFetched += 1;

    const candidates = data.results
      .filter(isTurkishOrigin)
      .filter(isTurkishLanguage)
      .filter(isScriptedSeries)
      .filter((r) => r.poster_path) // posteri olmayan (genelde henüz duyurulmuş) yapımlar gösterilmez
      .filter((r) => !DISCOVER_EXCLUDED_IDS.has(r.id));

    // Hangi kanalda yayınlandığı özet listede yok — her aday için ayrı bir
    // detay isteği gerekiyor. Sadece ALLOWED_BROADCAST_NETWORK_IDS'teki
    // kanallardan birinde yayınlanmış olanlar listede kalır.
    const candidateDetails = await Promise.all(candidates.map((c) => getShowById(c.id)));
    const filtered = candidates
      .filter((_, i) => isOnAllowedNetwork(candidateDetails[i]))
      .map(normalize);

    results = [...results, ...filtered];
    tmdbPage += 1;
  }

  if (cursor === 1 && !genreId) {
    // Promise.all, CLASSIC_PINNED_IDS'teki sırayı korur — gösterim sırası
    // doğrudan o listedeki elle kürasyon edilmiş sıra.
    const pinnedRaw = (await Promise.all(CLASSIC_PINNED_IDS.map(getShowById))).filter(
      (s): s is RawTvResult => s !== null,
    );
    const pinned = pinnedRaw.map(normalize);
    const pinnedIds = new Set(pinned.map((s) => s.tmdbId));
    results = [...pinned, ...results.filter((s) => !pinnedIds.has(s.tmdbId))];
  }

  return {
    results,
    hasMore: tmdbPage <= totalPages,
    nextCursor: tmdbPage,
  };
}

async function getShowById(tmdbId: number): Promise<RawTvResult | null> {
  const url = new URL(`${TMDB_API_URL}/tv/${tmdbId}`);
  url.searchParams.set("api_key", env.tmdbApiKey);
  url.searchParams.set("language", "tr-TR");
  const res = await fetch(url);
  if (!res.ok) return null;
  return (await res.json()) as RawTvResult;
}

// Trend listesinden elle çıkarılan yapımlar — kullanıcının isteğiyle küratörlük yapılıyor.
const TRENDING_EXCLUDED_IDS = new Set([
  283123, // Eşref Rüya
  300388, // Güller ve Günahlar
  215709, // Esaret
  64535, // Eşkıya Dünyaya Hükümdar Olmaz
  210865, // Yalı Çapkını
  274352, // Unutma Beni
  34899, // Muhteşem Yüzyıl
  95603, // Kuruluş: Osman
  213194, // Kızılcık Şerbeti
  32836, // Arka Sokaklar
  39014, // Yaprak Dökümü
  49347, // Elif
  49071, // Kurtlar Vadisi: Pusu
  74823, // Çukur
]);

// Trend listesine elle sabitlenen yapımlar — popülerlik sıralamasında henüz üst
// sıralarda olmasalar bile her zaman gösterilirler.
const TRENDING_PINNED_IDS = [
  322499, // Muhtemel Aşk
  321928, // Altı Üstü İstanbul
  320294, // Doğanın Kanunu
  330784, // Tuzlu Kahve
  309328, // Yeraltı
  331693, // Sevdam Karadeniz
  119806, // Teşkilat
];

export async function trendingTvShows(): Promise<TmdbShow[]> {
  const [pinned, recent, popular] = await Promise.all([
    Promise.all(TRENDING_PINNED_IDS.map(getShowById)),
    discoverResults(discoverTurkishDramaUrl({ "first_air_date.gte": "2025-01-01" })),
    // "Popular" havuzu da yakın tarihli tutulur, aksi halde eski ama sürekli
    // popüler diziler listeye sızıp yeni yapımların önüne geçebiliyordu.
    discoverResults(discoverTurkishDramaUrl({ "first_air_date.gte": "2023-01-01" })),
  ]);

  const merged: RawTvResult[] = [];
  const add = (show: RawTvResult | null) => {
    if (!show || TRENDING_EXCLUDED_IDS.has(show.id)) return;
    if (!merged.some((m) => m.id === show.id)) merged.push(show);
  };

  pinned.forEach(add);
  // 2025-2026 dizilerinin listede her zaman yer almasını garanti eder — sadece genel
  // popülerliğe göre sıralarsak yeni çıkan diziler eski klasiklerin gerisinde kalıp
  // hiç görünmeyebiliyordu.
  recent.slice(0, 6).forEach(add);
  for (const show of popular) {
    if (merged.length >= 12) break;
    add(show);
  }

  // Seçilen yapımlar en yeni yayın tarihinden en eskiye doğru sıralanır.
  const sorted = merged
    .slice(0, 12)
    .sort((a, b) => (b.first_air_date || "0000-00-00").localeCompare(a.first_air_date || "0000-00-00"));

  return sorted.map(normalize);
}
