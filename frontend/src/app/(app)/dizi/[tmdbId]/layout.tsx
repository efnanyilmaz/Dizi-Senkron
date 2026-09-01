import type { Metadata } from "next";
import type { ReactNode } from "react";
import { apiFetch } from "@/lib/api";
import { posterUrl } from "@/lib/tmdb-image";
import type { TmdbShowDetail } from "@/types/show";

// page.tsx bu segmentte client component olduğu için kendi metadata'sını
// tanımlayamıyor (generateMetadata sunucuda çalışır) — bu yüzden metadata
// burada, aynı segmentteki bir layout'ta üretiliyor. Next.js dinamik segment
// parametrelerini layout'a da page'e verdiği gibi veriyor.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ tmdbId: string }>;
}): Promise<Metadata> {
  const { tmdbId } = await params;

  try {
    const show = await apiFetch<TmdbShowDetail>(`/shows/tmdb/${tmdbId}`);
    const title = show.title;
    const description = show.overview
      ? show.overview.slice(0, 155)
      : `${show.title} için arkadaşlarınla grup kur, bölüm bölüm birlikte takip et.`;
    const image = posterUrl(show.posterPath, "w500");

    return {
      title,
      description,
      openGraph: { title, description, images: image ? [image] : undefined },
      twitter: { title, description, images: image ? [image] : undefined },
    };
  } catch {
    return { title: "Dizi" };
  }
}

export default function DiziLayout({ children }: { children: ReactNode }) {
  return children;
}
