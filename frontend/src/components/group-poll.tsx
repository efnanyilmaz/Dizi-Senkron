"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { UtilityPanel } from "@/components/utility-panel";
import { FieldError } from "@/components/field-error";
import { PosterThumb } from "@/components/poster-thumb";
import type { TmdbShow } from "@/types/show";
import { getErrorMessage } from "@/lib/get-error-message";

type PollOption = {
  id: string;
  label: string;
  tmdbId: number | null;
  posterPath: string | null;
  voteCount: number;
  votedByMe: boolean;
};
type Poll = {
  id: string;
  isOpen: boolean;
  creator: { id: string; displayName: string };
  canClose: boolean;
  canSwitchShow: boolean;
  winningOptionId: string | null;
  options: PollOption[];
};

type OptionDraft = { label: string; tmdbId?: number; posterPath?: string | null };

// Aday dizi girişi — serbest metin yazılabilir, ya da yazarken çıkan TMDB
// sonuçlarından biri seçilince o seçenek gerçek bir diziyle eşleşir (anket
// kapanınca "bu diziye geç" eylemi bunu gerektirir).
function OptionSearchField({
  value,
  onChange,
  placeholder,
}: {
  value: OptionDraft;
  onChange: (draft: OptionDraft) => void;
  placeholder: string;
}) {
  const [results, setResults] = useState<TmdbShow[]>([]);
  const [open, setOpen] = useState(false);
  const skipSearchRef = useRef(false);

  useEffect(() => {
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }
    if (!value.label.trim()) {
      queueMicrotask(() => setResults([]));
      return;
    }
    const timeout = setTimeout(() => {
      apiFetch<TmdbShow[]>(`/shows/search?q=${encodeURIComponent(value.label)}`)
        .then((r) => {
          setResults(r);
          setOpen(r.length > 0);
        })
        .catch(() => setResults([]));
    }, 350);
    return () => clearTimeout(timeout);
  }, [value.label]);

  function pick(show: TmdbShow) {
    skipSearchRef.current = true;
    onChange({ label: show.title, tmdbId: show.tmdbId, posterPath: show.posterPath });
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {value.tmdbId && (
          <span className="shrink-0 font-mono text-[10px] text-sync" title="TMDB'de bulundu">
            ✓
          </span>
        )}
        <input
          value={value.label}
          onChange={(e) => onChange({ label: e.target.value })}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="w-full border-b-2 border-screen-line bg-transparent pb-2 text-sm text-text-primary outline-none transition-colors placeholder:text-text-faint focus:border-signal"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 z-20 mt-1 max-h-56 w-full overflow-y-auto rounded border border-screen-line bg-screen shadow-[0_12px_28px_-12px_rgba(0,0,0,0.7)]">
          {results.slice(0, 6).map((show) => (
            <button
              key={show.tmdbId}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(show)}
              className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-colors hover:bg-signal-soft"
            >
              <PosterThumb title={show.title} posterPath={show.posterPath} width={26} height={39} />
              <span className="line-clamp-1 text-xs text-text-secondary">{show.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function GroupPoll({ groupId }: { groupId: string }) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [draftOptions, setDraftOptions] = useState<OptionDraft[]>([{ label: "" }, { label: "" }]);

  const [newOption, setNewOption] = useState<OptionDraft>({ label: "" });
  const [switching, setSwitching] = useState(false);

  function refresh() {
    return apiFetch<Poll | null>(`/groups/${groupId}/poll`)
      .then(setPoll)
      .catch(() => setError("Anket yüklenemedi."));
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const options = draftOptions.filter((o) => o.label.trim());
    if (options.length < 2) {
      setError("En az 2 aday dizi gerekli.");
      return;
    }
    try {
      const created = await apiFetch<Poll>(`/groups/${groupId}/poll`, {
        method: "POST",
        body: JSON.stringify({ options }),
      });
      setPoll(created);
      setCreating(false);
      setDraftOptions([{ label: "" }, { label: "" }]);
    } catch (err) {
      setError(getErrorMessage(err, "Anket oluşturulamadı."));
    }
  }

  async function handleVote(optionId: string) {
    if (!poll || !poll.isOpen) return;
    try {
      const updated = await apiFetch<Poll>(`/groups/${groupId}/poll/${poll.id}/vote`, {
        method: "POST",
        body: JSON.stringify({ optionId }),
      });
      setPoll(updated);
    } catch (err) {
      setError(getErrorMessage(err, "Oy verilemedi."));
    }
  }

  async function handleAddOption(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!poll || !newOption.label.trim()) return;
    try {
      const updated = await apiFetch<Poll>(`/groups/${groupId}/poll/${poll.id}/options`, {
        method: "POST",
        body: JSON.stringify(newOption),
      });
      setPoll(updated);
      setNewOption({ label: "" });
    } catch (err) {
      setError(getErrorMessage(err, "Seçenek eklenemedi."));
    }
  }

  async function handleClose() {
    if (!poll) return;
    try {
      await apiFetch(`/groups/${groupId}/poll/${poll.id}/close`, { method: "POST" });
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Anket kapatılamadı."));
    }
  }

  async function handleSwitchShow() {
    if (!poll) return;
    setSwitching(true);
    setError(null);
    try {
      await apiFetch(`/groups/${groupId}/poll/${poll.id}/switch-show`, { method: "POST" });
      // Grubun dizisi, üyelerin ilerlemesi ve sohbetin bağlamı hepsi değişti —
      // sayfanın tamamının taze veriyle yeniden yüklenmesi en güvenlisi.
      window.location.reload();
    } catch (err) {
      setError(getErrorMessage(err, "Dizi değiştirilemedi."));
      setSwitching(false);
    }
  }

  if (loading) return null;

  const totalVotes = poll ? poll.options.reduce((sum, o) => sum + o.voteCount, 0) : 0;
  const showResults = poll && !creating;
  const showCreateForm = creating || !poll;

  return (
    <UtilityPanel label="Sırada ne izleyelim?">
      {!poll && !creating && (
        <button
          onClick={() => setCreating(true)}
          className="rounded-[3px] border border-dashed border-screen-line px-4 py-2.5 font-mono text-[13px] tracking-[0.04em] text-text-primary transition-colors hover:border-signal hover:bg-signal-soft"
        >
          Anket başlat
        </button>
      )}

      {showCreateForm && creating && (
        <form onSubmit={handleCreate} className="space-y-3">
          {draftOptions.map((option, i) => (
            <OptionSearchField
              key={i}
              value={option}
              placeholder={`Aday dizi ${i + 1}`}
              onChange={(draft) =>
                setDraftOptions((prev) => prev.map((o, idx) => (idx === i ? draft : o)))
              }
            />
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setDraftOptions((prev) => [...prev, { label: "" }])}
              className="font-mono text-xs text-text-muted hover:text-text-primary"
            >
              + aday ekle
            </button>
            <button
              type="submit"
              className="rounded-[3px] border border-dashed border-screen-line px-4 py-2.5 font-mono text-[13px] tracking-[0.04em] text-text-primary transition-colors hover:border-signal hover:bg-signal-soft"
            >
              Anketi başlat
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="font-mono text-xs text-text-muted hover:text-text-primary"
            >
              vazgeç
            </button>
          </div>
        </form>
      )}

      {showResults && poll && (
        <div className="space-y-3">
          <div className="space-y-2">
            {poll.options.map((option) => {
              const pct = totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0;
              const isWinner = poll.winningOptionId === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => handleVote(option.id)}
                  disabled={!poll.isOpen}
                  className={`relative flex w-full items-center gap-2.5 overflow-hidden rounded border px-3 py-2 text-left transition-colors ${
                    option.votedByMe
                      ? "border-signal bg-signal-soft"
                      : isWinner
                        ? "border-sync"
                        : "border-screen-line"
                  } ${poll.isOpen ? "hover:border-signal" : "cursor-default"}`}
                >
                  <motion.div
                    initial={false}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-y-0 left-0 -z-10 bg-screen-glow"
                  />
                  {option.posterPath && (
                    <PosterThumb title={option.label} posterPath={option.posterPath} width={22} height={33} />
                  )}
                  <div className="flex flex-1 items-center justify-between font-mono text-sm text-text-primary">
                    <span className="flex items-center gap-1.5">
                      {isWinner && <span className="text-sync">🏆</span>}
                      {option.label}
                    </span>
                    <span className="text-xs text-text-muted">
                      {option.voteCount} oy · %{pct}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {poll.isOpen && (
            <form onSubmit={handleAddOption} className="flex items-end gap-3">
              <div className="flex-1">
                <OptionSearchField
                  value={newOption}
                  onChange={setNewOption}
                  placeholder="Başka bir aday ekle…"
                />
              </div>
              <button
                type="submit"
                className="pb-2 font-mono text-xs text-text-muted hover:text-text-primary"
              >
                ekle
              </button>
            </form>
          )}

          {poll.isOpen && poll.canClose && (
            <button
              onClick={handleClose}
              className="font-mono text-xs text-text-muted underline underline-offset-2 hover:text-text-primary"
            >
              Anketi kapat
            </button>
          )}

          {!poll.isOpen && (
            <div className="flex flex-wrap items-center gap-3 border-t border-dashed border-screen-line pt-3">
              {poll.canSwitchShow && (
                <button
                  onClick={handleSwitchShow}
                  disabled={switching}
                  className="rounded-[3px] border border-dashed border-sync px-4 py-2.5 font-mono text-[13px] tracking-[0.04em] text-sync transition-colors hover:bg-sync/10 disabled:opacity-60"
                >
                  {switching ? "Geçiliyor…" : "Kazanan diziye geç →"}
                </button>
              )}
              {poll.canClose && (
                <button
                  onClick={() => setCreating(true)}
                  className="font-mono text-xs text-text-muted hover:text-text-primary"
                >
                  Yeni anket başlat
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {error && <div className="mt-3"><FieldError>{error}</FieldError></div>}
    </UtilityPanel>
  );
}
