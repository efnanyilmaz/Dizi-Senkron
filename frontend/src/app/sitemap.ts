import type { MetadataRoute } from "next";

const BASE_URL = "https://dizisenkron.app";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

// Sitemap'i her istekte TMDB'ye vurdurmamak için bir saat önbellekte tutuyoruz.
export const revalidate = 3600;

type DiscoverResponse = {
  results: { tmdbId: number }[];
  hasMore: boolean;
  nextCursor: number;
};

// Keşfet kataloğundan birkaç sayfa çekip dizi detay sayfalarını sitemap'e
// ekliyor — tamamını değil (binlerce olabilir), en güncel/öne çıkan ilk
// birkaç sayfa yeterli, geri kalanı zaten iç bağlantılarla keşfedilebilir.
async function discoverShowUrls(): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = [];
  let cursor = 1;

  for (let page = 0; page < 3; page += 1) {
    const res = await fetch(`${API_URL}/shows/discover?cursor=${cursor}`, {
      next: { revalidate },
    }).catch(() => null);
    if (!res?.ok) break;

    const data = (await res.json()) as DiscoverResponse;
    for (const show of data.results) {
      urls.push({ url: `${BASE_URL}/dizi/${show.tmdbId}`, changeFrequency: "weekly", priority: 0.7 });
    }

    if (!data.hasMore) break;
    cursor = data.nextCursor;
  }

  return urls;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/kesfet`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/giris`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/kayit`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${BASE_URL}/iletisim`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/gizlilik`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/kullanim-kosullari`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const showRoutes = await discoverShowUrls();

  return [...staticRoutes, ...showRoutes];
}
