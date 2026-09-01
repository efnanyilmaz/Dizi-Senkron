import { prisma } from "./prisma.js";
import { getShowDetails } from "./tmdb.js";

// Show kayıtlarını her zaman TMDB'den taze veriyle yazar/günceller —
// istemciden gelen posterPath/backdropPath/voteAverage gibi alanlara
// güvenilmez. Bir yerde eksik/yanlış gönderilirse (test verisi, entegrasyon
// hatası vb.) kayıt kalıcı olarak bozuk kalırdı, çünkü upsert'in update kolu
// genelde bu alanlara hiç dokunmuyordu. tmdbId tek doğruluk kaynağıdır —
// dizi her dokunulduğunda (favoriye eklenince, izleme durumu işaretlenince,
// grup kurulunca vb.) kendini TMDB'ye göre düzeltir.
export async function upsertShowFromTmdb(tmdbId: number, fallbackTitle?: string) {
  const details = await getShowDetails(tmdbId).catch(() => null);

  if (details) {
    const data = {
      title: details.title,
      posterPath: details.posterPath,
      backdropPath: details.backdropPath,
      voteAverage: details.voteAverage,
      totalSeasons: details.numberOfSeasons,
      totalEpisodes: details.numberOfEpisodes,
    };
    return prisma.show.upsert({
      where: { tmdbId },
      update: data,
      create: { tmdbId, ...data },
    });
  }

  // TMDB'ye ulaşılamadıysa (geçici ağ sorunu), kayıt hiç yoksa en azından
  // başlıkla oluşturulur — sonraki bir dokunuşta kendini tamamlar.
  return prisma.show.upsert({
    where: { tmdbId },
    update: {},
    create: { tmdbId, title: fallbackTitle ?? "Bilinmeyen dizi" },
  });
}
