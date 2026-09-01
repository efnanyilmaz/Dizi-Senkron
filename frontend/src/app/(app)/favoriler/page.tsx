"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { PosterCard } from "@/components/poster-card";
import { ClapperLoader } from "@/components/clapper-loader";
import { withMinDelay } from "@/lib/min-delay";
import type { ShowDTO } from "@/types/show";

export default function FavorilerPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<ShowDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    withMinDelay(apiFetch<ShowDTO[]>("/favorites/mine"), 900)
      .then(setFavorites)
      .catch(() => setFavorites([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleRemove(show: ShowDTO) {
    await apiFetch(`/favorites/${show.id}`, { method: "DELETE" }).catch(() => {});
    setFavorites((prev) => prev.filter((f) => f.id !== show.id));
  }

  return (
    <main className="mx-auto w-full max-w-[1180px] px-8 py-16">
      <div className="mb-10">
        <div className="mb-2 font-mono text-xs tracking-[0.16em] text-text-muted uppercase">
          Kişisel liste
        </div>
        <h1 className="font-display text-3xl text-text-primary">Favorilerim</h1>
      </div>

      {loading ? (
        <ClapperLoader />
      ) : favorites.length === 0 ? (
        <div className="rounded-lg border border-dashed border-screen-line px-6 py-14 text-center">
          <p className="mb-2 text-[15px] text-text-secondary">Henüz favori dizin yok.</p>
          <p className="font-mono text-xs text-text-muted">
            Gruplarım sayfasındaki &ldquo;Keşfet&rdquo; satırından bir dizinin kalp ikonuna dokun.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-5">
          {favorites.map((show) => (
            <PosterCard
              key={show.id}
              title={show.title}
              posterPath={show.posterPath}
              voteAverage={show.voteAverage}
              isFavorite
              onToggleFavorite={() => handleRemove(show)}
              onClick={() => router.push(`/dizi/${show.tmdbId}`)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
