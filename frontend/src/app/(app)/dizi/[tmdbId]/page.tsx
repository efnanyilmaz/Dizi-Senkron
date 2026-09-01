"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { backdropUrl, posterUrl } from "@/lib/tmdb-image";
import { RatingBadge } from "@/components/rating-badge";
import { PosterThumb } from "@/components/poster-thumb";
import { ClapperLoader } from "@/components/clapper-loader";
import { FieldError } from "@/components/field-error";
import { NextEpisodeBanner } from "@/components/next-episode-banner";
import { withMinDelay } from "@/lib/min-delay";
import type { ShowDTO, TmdbShowDetail } from "@/types/show";
import { getErrorMessage } from "@/lib/get-error-message";

export default function DiziDetayPage() {
  const params = useParams<{ tmdbId: string }>();
  const router = useRouter();
  const tmdbId = Number(params.tmdbId);

  const [show, setShow] = useState<TmdbShowDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteShowId, setFavoriteShowId] = useState<string | null>(null);

  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    withMinDelay(
      Promise.all([
        apiFetch<TmdbShowDetail>(`/shows/tmdb/${tmdbId}`),
        apiFetch<ShowDTO[]>("/favorites/mine").catch(() => []),
      ]),
      900,
    )
      .then(([detail, favorites]) => {
        setShow(detail);
        setGroupName(`${detail.title} grubu`);
        const existing = favorites.find((f) => f.tmdbId === tmdbId);
        setIsFavorite(!!existing);
        setFavoriteShowId(existing?.id ?? null);
      })
      .catch((err) => setLoadError(getErrorMessage(err, "Dizi yüklenemedi.")))
      .finally(() => setLoading(false));
  }, [tmdbId]);

  async function toggleFavorite() {
    if (!show) return;
    if (isFavorite && favoriteShowId) {
      await apiFetch(`/favorites/${favoriteShowId}`, { method: "DELETE" }).catch(() => {});
      setIsFavorite(false);
    } else {
      const saved = await apiFetch<ShowDTO>("/favorites", {
        method: "POST",
        body: JSON.stringify(show),
      }).catch(() => null);
      if (saved) {
        setIsFavorite(true);
        setFavoriteShowId(saved.id);
      }
    }
  }

  async function handleCreateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!show) return;
    setCreateError(null);
    setCreating(true);
    try {
      const savedShow = await apiFetch<ShowDTO>("/shows", { method: "POST", body: JSON.stringify(show) });
      const group = await apiFetch<{ id: string }>("/groups", {
        method: "POST",
        body: JSON.stringify({ showId: savedShow.id, name: groupName.trim() }),
      });
      router.push(`/grup/${group.id}`);
    } catch (err) {
      setCreateError(getErrorMessage(err));
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-[1180px] px-8 py-16">
        <ClapperLoader />
      </main>
    );
  }

  if (loadError || !show) {
    return (
      <main className="mx-auto w-full max-w-[1180px] px-8 py-16">
        <p className="mb-4 text-danger">{loadError ?? "Dizi bulunamadı."}</p>
      </main>
    );
  }

  const backdrop = backdropUrl(show.backdropPath, "original");

  return (
    <main className="mx-auto w-full max-w-[1180px] px-8 py-16">
      <motion.div
        initial={{ opacity: 0, scale: 1.02 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative mb-8 overflow-hidden rounded-lg border border-screen-line"
      >
        {backdrop && <Image src={backdrop} alt="" fill priority sizes="1180px" className="object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-screen via-screen/70 to-screen/20" />
        <div className="sprocket-strip sprocket-strip-live absolute inset-x-0 top-0 z-10" />
        <div className="sprocket-strip sprocket-strip-live absolute inset-x-0 bottom-0 z-10" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="relative flex items-end gap-5 px-6 pt-32 pb-6 max-[700px]:flex-col max-[700px]:items-start max-[700px]:pt-20"
        >
          <PosterThumb
            title={show.title}
            posterPath={show.posterPath}
            width={110}
            height={165}
            className="shrink-0 shadow-[0_14px_28px_rgba(0,0,0,0.55)]"
          />
          <div className="min-w-0">
            <h1 lang="tr" className="mb-2 font-display text-4xl text-balance text-text-primary max-[700px]:text-3xl">
              {show.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-text-secondary">
              {show.firstAirYear}
              <RatingBadge voteAverage={show.voteAverage} />
              {show.genres.map((genre, i) => (
                <motion.span
                  key={genre}
                  initial={{ opacity: 0, scale: 0.5, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.2 + i * 0.06 }}
                  className="rounded-full border border-screen-line px-2.5 py-1 tracking-[0.04em] text-text-caption uppercase"
                >
                  {genre}
                </motion.span>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-8 max-[900px]:grid-cols-1">
        <div>
          <h2 className="mb-3 font-mono text-xs tracking-[0.16em] text-text-muted uppercase">Konu</h2>
          <p className="mb-8 max-w-[62ch] text-[15px] leading-relaxed text-text-secondary">{show.overview}</p>

          {show.cast.length > 0 && (
            <>
              <h2 className="mb-3 font-mono text-xs tracking-[0.16em] text-text-muted uppercase">Oyuncular</h2>
              <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
                {show.cast.map((actor) => (
                  <div key={actor.name} className="w-[92px] shrink-0 text-center">
                    <div className="mx-auto mb-2 h-[92px] w-[92px] overflow-hidden rounded-full border border-screen-line bg-screen-glow">
                      {actor.profilePath ? (
                        <Image
                          src={posterUrl(actor.profilePath, "w185")!}
                          alt=""
                          width={92}
                          height={92}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center font-display text-2xl text-text-faint">
                          {actor.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="line-clamp-1 text-xs font-medium text-text-primary">{actor.name}</div>
                    <div className="line-clamp-1 font-mono text-[10px] text-text-muted">{actor.character}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <NextEpisodeBanner nextEpisode={show.nextEpisode} />

          <form
            onSubmit={handleCreateGroup}
            className="marquee-border rounded-lg border border-screen-line bg-screen-glow px-5 py-5"
          >
            <span className="mb-3 block font-mono text-xs tracking-[0.08em] text-text-caption uppercase">
              Bu dizi için grup oluştur
            </span>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
              minLength={2}
              className="mb-3 w-full rounded border border-screen-line bg-transparent px-3 py-2 text-sm text-text-primary outline-none focus:border-signal"
            />
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-lg bg-guide px-4 py-3 font-semibold text-ink transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            >
              {creating ? "Oluşturuluyor…" : "Grup oluştur →"}
            </button>
            {createError && <FieldError>{createError}</FieldError>}
          </form>

          <button
            onClick={toggleFavorite}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-screen-line bg-screen-glow px-4 py-3 font-mono text-xs tracking-[0.04em] text-text-primary transition-colors hover:border-signal hover:bg-signal-soft"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill={isFavorite ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={2}
              className={isFavorite ? "text-signal" : ""}
            >
              <path d="M6 3h12a1 1 0 0 1 1 1v16l-7-4-7 4V4a1 1 0 0 1 1-1z" strokeLinejoin="round" />
            </svg>
            {isFavorite ? "Favorilerimde" : "Favorilere ekle"}
          </button>

          {(show.numberOfSeasons || show.numberOfEpisodes) && (
            <div className="rounded-lg border border-screen-line bg-screen-glow px-5 py-4 font-mono text-xs text-text-muted">
              {show.numberOfSeasons} sezon · {show.numberOfEpisodes} bölüm
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
