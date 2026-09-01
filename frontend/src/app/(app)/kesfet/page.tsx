"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { apiFetch, ApiError } from "@/lib/api";
import { PosterCard } from "@/components/poster-card";
import { PosterGridSkeleton } from "@/components/skeletons";
import type { ShowDTO, TmdbShow } from "@/types/show";

type Genre = { id: number; name: string };

// Sayfalama sınırında aynı dizinin iki kez gelmesine karşı savunma —
// tmdbId bazında ilk görüleni tutar.
function dedupeByTmdbId(shows: TmdbShow[]): TmdbShow[] {
  const seen = new Set<number>();
  return shows.filter((show) => {
    if (seen.has(show.tmdbId)) return false;
    seen.add(show.tmdbId);
    return true;
  });
}

export default function KesfetPage() {
  const router = useRouter();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [activeGenre, setActiveGenre] = useState<number | null>(null);
  const [shows, setShows] = useState<TmdbShow[]>([]);
  const [favorites, setFavorites] = useState<ShowDTO[]>([]);
  const [cursor, setCursor] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TmdbShow[] | null>(null);
  const [searching, setSearching] = useState(false);
  const isSearchMode = searchResults !== null;

  useEffect(() => {
    apiFetch<Genre[]>("/shows/genres")
      .then(setGenres)
      .catch(() => setGenres([]));

    // Önce oturum var mı diye sessizce yokla (bu uç nokta girişsizken de 200
    // döner) — yoksa korumalı /favorites/mine hiç çağrılmıyor.
    apiFetch<{ id: string } | null>("/auth/me").then((me) => {
      if (!me) return;
      apiFetch<ShowDTO[]>("/favorites/mine")
        .then(setFavorites)
        .catch(() => setFavorites([]));
    });
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
      setCursor(1);
    });

    const params = new URLSearchParams({ cursor: "1" });
    if (activeGenre) params.set("genre", String(activeGenre));

    apiFetch<{ results: TmdbShow[]; hasMore: boolean; nextCursor: number }>(`/shows/discover?${params}`)
      .then((data) => {
        setShows(dedupeByTmdbId(data.results));
        setHasMore(data.hasMore);
        setCursor(data.nextCursor);
      })
      .catch(() => setError("Diziler yüklenemedi, bağlantı sorunlu olabilir."))
      .finally(() => setLoading(false));
  }, [activeGenre]);

  useEffect(() => {
    if (!query.trim()) {
      queueMicrotask(() => setSearchResults(null));
      return;
    }
    const timeout = setTimeout(() => {
      setSearching(true);
      apiFetch<TmdbShow[]>(`/shows/search?q=${encodeURIComponent(query.trim())}`)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(timeout);
  }, [query]);

  async function loadMore() {
    setLoadingMore(true);
    const params = new URLSearchParams({ cursor: String(cursor) });
    if (activeGenre) params.set("genre", String(activeGenre));

    try {
      const data = await apiFetch<{ results: TmdbShow[]; hasMore: boolean; nextCursor: number }>(
        `/shows/discover?${params}`,
      );
      setShows((prev) => dedupeByTmdbId([...prev, ...data.results]));
      setHasMore(data.hasMore);
      setCursor(data.nextCursor);
    } catch {
      setError("Daha fazla dizi yüklenemedi.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function toggleFavorite(show: TmdbShow) {
    const existing = favorites.find((f) => f.tmdbId === show.tmdbId);
    if (existing) {
      await apiFetch(`/favorites/${existing.id}`, { method: "DELETE" }).catch(() => {});
      setFavorites((prev) => prev.filter((f) => f.id !== existing.id));
      return;
    }
    try {
      const saved = await apiFetch<ShowDTO>("/favorites", {
        method: "POST",
        body: JSON.stringify({
          tmdbId: show.tmdbId,
          title: show.title,
          posterPath: show.posterPath,
          backdropPath: show.backdropPath,
          voteAverage: show.voteAverage,
        }),
      });
      setFavorites((prev) => [saved, ...prev]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push("/giris");
      }
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1180px] px-8 py-16">
      <div className="mb-8">
        <h1 className="font-display text-[clamp(32px,4vw,44px)] text-text-primary">Keşfet</h1>
      </div>

      <div className="relative mb-6 max-w-sm">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Dizi ara…"
          className="w-full border-b-2 border-screen-line bg-transparent py-2 pr-8 text-sm text-text-primary outline-none transition-colors placeholder:text-text-faint focus:border-signal"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Aramayı temizle"
            className="absolute top-1/2 right-1 -translate-y-1/2 font-mono text-sm text-text-muted hover:text-text-primary"
          >
            ×
          </button>
        )}
      </div>

      {!isSearchMode && (
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveGenre(null)}
            className={`rounded-full border border-dashed px-3.5 py-1.5 font-mono text-xs tracking-[0.04em] transition-colors ${
              activeGenre === null
                ? "border-signal bg-signal-soft text-text-primary"
                : "border-screen-line text-text-muted hover:border-signal hover:text-text-primary"
            }`}
          >
            Tümü
          </button>
          {genres.map((genre) => (
            <button
              key={genre.id}
              onClick={() => setActiveGenre(genre.id)}
              className={`rounded-full border border-dashed px-3.5 py-1.5 font-mono text-xs tracking-[0.04em] transition-colors ${
                activeGenre === genre.id
                  ? "border-signal bg-signal-soft text-text-primary"
                  : "border-screen-line text-text-muted hover:border-signal hover:text-text-primary"
              }`}
            >
              {genre.name}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mb-6 text-sm text-danger">{error}</p>}

      {isSearchMode && searching && (
        <p className="mb-6 font-mono text-xs text-text-muted">Aranıyor…</p>
      )}

      {isSearchMode && !searching && searchResults!.length === 0 && (
        <p className="font-mono text-sm text-text-muted">&quot;{query}&quot; için sonuç bulunamadı.</p>
      )}

      {!isSearchMode && !loading && shows.length === 0 && !error && (
        <p className="font-mono text-sm text-text-muted">Bu türde henüz dizi bulunamadı.</p>
      )}

      {!isSearchMode && loading && shows.length === 0 && <PosterGridSkeleton />}

      <div className="flex flex-wrap gap-4">
        {(isSearchMode ? searchResults! : shows).map((show, i) => (
          <motion.div
            key={`${show.tmdbId}-${i}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: (i % 12) * 0.02 }}
          >
            <PosterCard
              title={show.title}
              posterPath={show.posterPath}
              year={show.firstAirYear}
              voteAverage={show.voteAverage}
              isFavorite={favorites.some((f) => f.tmdbId === show.tmdbId)}
              onToggleFavorite={() => toggleFavorite(show)}
              onClick={() => router.push(`/dizi/${show.tmdbId}`)}
            />
          </motion.div>
        ))}
      </div>

      {!isSearchMode && hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-[3px] border border-dashed border-screen-line px-5 py-2.5 font-mono text-[13px] tracking-[0.04em] text-text-primary transition-colors hover:border-signal hover:bg-signal-soft disabled:opacity-60"
          >
            {loadingMore ? "Yükleniyor…" : "Daha fazla yükle"}
          </button>
        </div>
      )}
    </main>
  );
}
