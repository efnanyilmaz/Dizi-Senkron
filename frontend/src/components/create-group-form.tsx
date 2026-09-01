"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { RatingBadge } from "@/components/rating-badge";
import { PosterThumb } from "@/components/poster-thumb";
import { TicketField } from "@/components/ticket-field";
import { FieldError } from "@/components/field-error";
import { UtilityPanel } from "@/components/utility-panel";
import { posterUrl } from "@/lib/tmdb-image";
import type { ShowDTO, TmdbShow, TmdbShowDetail } from "@/types/show";
import { getErrorMessage } from "@/lib/get-error-message";

export function CreateGroupForm({ presetShow }: { presetShow?: TmdbShow | null }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbShow[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<TmdbShow | null>(null);
  const [detail, setDetail] = useState<TmdbShowDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!presetShow) return;
    pickShow(presetShow);
    document.getElementById("yeni-grup")?.scrollIntoView({ behavior: "smooth", block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetShow?.tmdbId]);

  useEffect(() => {
    if (!query.trim() || selected) return;

    const timeout = setTimeout(() => {
      setSearching(true);
      apiFetch<TmdbShow[]>(`/shows/search?q=${encodeURIComponent(query)}`)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(timeout);
  }, [query, selected]);

  function pickShow(show: TmdbShow) {
    setSelected(show);
    setResults([]);
    setGroupName(`${show.title} grubu`);
    setDetail(null);
    setLoadingDetail(true);
    apiFetch<TmdbShowDetail>(`/shows/tmdb/${show.tmdbId}`)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoadingDetail(false));
  }

  function clearSelection() {
    setSelected(null);
    setDetail(null);
    setQuery("");
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setError(null);
    setCreating(true);
    try {
      const show = await apiFetch<ShowDTO>("/shows", {
        method: "POST",
        body: JSON.stringify(selected),
      });
      const group = await apiFetch<{ id: string }>("/groups", {
        method: "POST",
        body: JSON.stringify({ showId: show.id, name: groupName.trim(), isPublic }),
      });
      router.push(`/grup/${group.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
      setCreating(false);
    }
  }

  return (
    <UtilityPanel id="yeni-grup" label="Yeni grup için dizi ara" className="mb-6 scroll-mt-6">
      {!selected ? (
        <input
          value={query}
          onChange={(e) => {
            const value = e.target.value;
            setQuery(value);
            if (!value.trim()) setResults([]);
          }}
          placeholder="Örn. Medcezir"
          className="w-full border-b-2 border-screen-line bg-transparent pb-2 text-sm text-text-primary outline-none transition-colors placeholder:text-text-faint focus:border-signal"
        />
      ) : (
        <div>
          <div className="flex items-start gap-3">
            <PosterThumb
              title={selected.title}
              posterPath={selected.posterPath}
              width={64}
              height={96}
              className="shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-text-primary">{selected.title}</div>
                  <div className="mt-1 flex items-center gap-2 font-mono text-[11px] text-text-muted">
                    {selected.firstAirYear}
                    <RatingBadge voteAverage={selected.voteAverage} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="shrink-0 font-mono text-[11px] text-text-muted hover:text-text-primary"
                >
                  değiştir
                </button>
              </div>

              {loadingDetail && (
                <p className="mt-2 font-mono text-xs text-text-muted">Bilgiler yükleniyor…</p>
              )}

              {detail?.overview && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-text-secondary"
                >
                  {detail.overview}
                </motion.p>
              )}
            </div>
          </div>

          {detail && detail.cast.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="no-scrollbar mt-4 flex gap-3 overflow-x-auto pb-1"
            >
              {detail.cast.slice(0, 8).map((actor) => (
                <div key={actor.name} className="w-[60px] shrink-0 text-center">
                  <div className="mx-auto mb-1.5 h-[52px] w-[52px] overflow-hidden rounded-full border border-screen-line bg-screen">
                    {actor.profilePath ? (
                      <Image
                        src={posterUrl(actor.profilePath, "w185")!}
                        alt=""
                        width={52}
                        height={52}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center font-display text-sm text-text-faint">
                        {actor.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="line-clamp-1 text-[10px] text-text-secondary">{actor.name}</div>
                </div>
              ))}
            </motion.div>
          )}

          <form onSubmit={handleCreate} className="mt-5 border-t border-dashed border-screen-line pt-4">
            <label className="mb-4 flex items-center gap-2 font-mono text-xs text-text-muted">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-3.5 w-3.5 accent-signal"
              />
              Herkese açık grup — davet kodu olmadan da katılınabilir
            </label>

            <div className="flex flex-wrap items-end gap-4">
            <TicketField
              label="Grup adı"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
              minLength={2}
              className="flex-1"
            />

            <button
              type="submit"
              disabled={creating}
              className="rounded-[3px] border border-dashed border-screen-line px-4 py-2.5 font-mono text-[13px] tracking-[0.04em] text-text-primary transition-colors hover:border-signal hover:bg-signal-soft disabled:opacity-60"
            >
              {creating ? "Oluşturuluyor…" : "Grup oluştur"}
            </button>
            </div>
          </form>
        </div>
      )}

      {error && <FieldError>{error}</FieldError>}

      {searching && <p className="mt-3 font-mono text-xs text-text-muted">Aranıyor…</p>}

      {results.length > 0 && (
        <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto pb-1">
          {results.map((show) => (
            <button
              key={show.tmdbId}
              onClick={() => pickShow(show)}
              className="group w-[110px] shrink-0 text-left"
            >
              <div className="overflow-hidden rounded border border-screen-line transition-transform group-hover:scale-105">
                <PosterThumb title={show.title} posterPath={show.posterPath} width={110} height={165} />
              </div>
              <div className="mt-1.5 line-clamp-2 text-xs text-text-secondary">{show.title}</div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-text-faint">{show.firstAirYear}</span>
                <RatingBadge voteAverage={show.voteAverage} />
              </div>
            </button>
          ))}
        </div>
      )}
    </UtilityPanel>
  );
}
