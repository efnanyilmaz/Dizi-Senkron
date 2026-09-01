"use client";

import { useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { apiFetch, ApiError } from "@/lib/api";
import { extractYoutubeVideoId, type YoutubeChannel, type YoutubeSearchResult } from "@/lib/youtube";
import { extractDailymotionVideoId, type DailymotionChannel, type DailymotionSearchResult } from "@/lib/dailymotion";
import { FieldError } from "@/components/field-error";
import { getErrorMessage } from "@/lib/get-error-message";

export type PickedVideo =
  | { videoId: string; dailymotionId?: undefined; externalUrl?: undefined; title: string; embeddable: boolean }
  | { videoId?: undefined; dailymotionId: string; externalUrl?: undefined; title: string; embeddable: boolean }
  | { videoId?: undefined; dailymotionId?: undefined; externalUrl: string; title: string; embeddable: false };

type MergedResult =
  | { platform: "youtube"; videoId: string; title: string; sourceLabel: string; thumbnailUrl: string | null }
  | { platform: "dailymotion"; videoId: string; title: string; sourceLabel: string; thumbnailUrl: string | null };

export function YoutubeSearchPicker({
  showTitle,
  tmdbId,
  onPick,
  submitLabel = "Yükle",
}: {
  showTitle: string;
  tmdbId?: number | null;
  onPick: (picked: PickedVideo) => void;
  submitLabel?: string;
}) {
  const [mode, setMode] = useState<"search" | "link">("search");
  const [ytChannel, setYtChannel] = useState<YoutubeChannel | null | undefined>(undefined);
  const [dmChannel, setDmChannel] = useState<DailymotionChannel | null | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [ytResults, setYtResults] = useState<YoutubeSearchResult[]>([]);
  const [dmResults, setDmResults] = useState<DailymotionSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  // YouTube arama kotası (günlük sınır) dolunca, kullanıcıyı takılı bırakmak
  // yerine otomatik olarak link yapıştırma moduna geçiririz — Dailymotion'ın
  // aynı kotası olmadığı için o sonuçlar etkilenmez.
  const [quotaExhausted, setQuotaExhausted] = useState(false);

  // Bölüm aramasını dizinin kendi kanalına sabitlemek için, önce o dizinin
  // bölümlerini büyük ihtimalle yükleyen baskın kanalı her iki platformda da
  // bir kere tespit ederiz.
  useEffect(() => {
    let cancelled = false;
    // tmdbId varsa dizinin gerçek ilk yayın yılı da gönderilir — aynı adı
    // taşıyan ama alakasız, çok daha eski bir yapımın "resmi kanal/hesap"
    // sanılmasını engeller (bkz. backend).
    const tmdbParam = tmdbId ? `&tmdbId=${tmdbId}` : "";
    apiFetch<YoutubeChannel | null>(`/youtube/channel?title=${encodeURIComponent(showTitle)}${tmdbParam}`)
      .then((result) => {
        if (!cancelled) setYtChannel(result);
      })
      .catch(() => {
        if (!cancelled) setYtChannel(null);
      });
    apiFetch<DailymotionChannel | null>(
      `/dailymotion/channel?title=${encodeURIComponent(showTitle)}${tmdbParam}`,
    )
      .then((result) => {
        if (!cancelled) setDmChannel(result);
      })
      .catch(() => {
        if (!cancelled) setDmChannel(null);
      });
    return () => {
      cancelled = true;
    };
  }, [showTitle, tmdbId]);

  useEffect(() => {
    if (ytChannel === undefined || dmChannel === undefined || !query.trim()) {
      queueMicrotask(() => {
        setYtResults([]);
        setDmResults([]);
      });
      return;
    }
    const timeout = setTimeout(() => {
      setSearching(true);
      setSearchError(null);
      // Dizi adı her zaman sorguya eklenir. Kanal tespit edilemediyse
      // backend hiç arama yapmadan boş döner (bkz. backend) — alakasız
      // dizilere ait sonuçlar gösterilmesin diye kanalsız aramaya
      // düşülmüyor artık.
      const effectiveQuery = `${showTitle} ${query}`;
      const ytUrl = ytChannel
        ? `/youtube/search?q=${encodeURIComponent(effectiveQuery)}&channelId=${ytChannel.channelId}`
        : `/youtube/search?q=${encodeURIComponent(effectiveQuery)}`;
      const dmUrl = dmChannel
        ? `/dailymotion/search?q=${encodeURIComponent(effectiveQuery)}&ownerName=${encodeURIComponent(dmChannel.ownerName)}`
        : `/dailymotion/search?q=${encodeURIComponent(effectiveQuery)}`;

      Promise.allSettled([
        apiFetch<YoutubeSearchResult[]>(ytUrl),
        apiFetch<DailymotionSearchResult[]>(dmUrl),
      ])
        .then(([ytOutcome, dmOutcome]) => {
          if (ytOutcome.status === "fulfilled") {
            setYtResults(ytOutcome.value);
            setQuotaExhausted(false);
          } else {
            setYtResults([]);
            const err = ytOutcome.reason;
            if (err instanceof ApiError && err.status === 429) {
              setQuotaExhausted(true);
            } else {
              setSearchError(getErrorMessage(err, "Arama başarısız oldu."));
            }
          }

          if (dmOutcome.status === "fulfilled") {
            setDmResults(dmOutcome.value);
          } else {
            setDmResults([]);
          }

          // YouTube kotası dolduysa ve Dailymotion'da da hiç sonuç yoksa,
          // link yapıştırmaya yönlendir.
          if (ytOutcome.status === "rejected" && dmOutcome.status === "fulfilled" && dmOutcome.value.length === 0) {
            const err = ytOutcome.reason;
            if (err instanceof ApiError && err.status === 429) setMode("link");
          }
        })
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(timeout);
  }, [query, ytChannel, dmChannel, showTitle]);

  async function handleLinkSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedInput = urlInput.trim();
    const ytId = extractYoutubeVideoId(trimmedInput);
    const dmId = extractDailymotionVideoId(trimmedInput);

    // Hangi platformdan geldiği tanınırsa süre/gömülebilirlik sunucuda
    // doğrulanır. Tanınmayan bir linkse (kanal sitesi vb.) bunu doğrulayacak
    // bir API'miz yok — geçerli bir http(s) linki olduğu kontrol edilip
    // doğrudan "harici link" moduna alınır.
    if (ytId) {
      setLinkError(null);
      setValidating(true);
      try {
        const result = await apiFetch<{ ok: true; title: string; embeddable: boolean }>(
          `/youtube/validate?videoId=${ytId}`,
        );
        onPick({ videoId: ytId, title: result.title, embeddable: result.embeddable });
        setUrlInput("");
      } catch (err) {
        setLinkError(getErrorMessage(err, "Bu link doğrulanamadı."));
      } finally {
        setValidating(false);
      }
      return;
    }

    if (dmId) {
      setLinkError(null);
      setValidating(true);
      try {
        const result = await apiFetch<{ ok: true; title: string; embeddable: boolean }>(
          `/dailymotion/validate?videoId=${dmId}`,
        );
        onPick({ dailymotionId: dmId, title: result.title, embeddable: result.embeddable });
        setUrlInput("");
      } catch (err) {
        setLinkError(getErrorMessage(err, "Bu link doğrulanamadı."));
      } finally {
        setValidating(false);
      }
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(trimmedInput);
    } catch {
      setLinkError("Geçerli bir link değil.");
      return;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      setLinkError("Geçerli bir link değil.");
      return;
    }

    setLinkError(null);
    onPick({ externalUrl: parsed.toString(), title: "Harici video", embeddable: false });
    setUrlInput("");
  }

  const merged: MergedResult[] = [
    ...ytResults.map(
      (r): MergedResult => ({
        platform: "youtube",
        videoId: r.videoId,
        title: r.title,
        sourceLabel: r.channelTitle,
        thumbnailUrl: r.thumbnailUrl,
      }),
    ),
    ...dmResults.map(
      (r): MergedResult => ({
        platform: "dailymotion",
        videoId: r.videoId,
        title: r.title,
        sourceLabel: r.ownerName,
        thumbnailUrl: r.thumbnailUrl,
      }),
    ),
  ];

  function handleResultPick(result: MergedResult) {
    if (result.platform === "youtube") {
      onPick({ videoId: result.videoId, title: result.title, embeddable: true });
    } else {
      onPick({ dailymotionId: result.videoId, title: result.title, embeddable: true });
    }
  }

  if (mode === "link") {
    return (
      <form onSubmit={handleLinkSubmit} className="flex flex-wrap items-end gap-3">
        {quotaExhausted && (
          <p className="w-full rounded border border-dashed border-signal/40 bg-signal-soft px-3 py-2 font-mono text-[11px] text-signal">
            YouTube araması şu an günlük sınırına ulaştı — ama link yapıştırarak devam edebilirsin.
          </p>
        )}
        <label className="min-w-0 flex-1">
          <span className="mb-1.5 block font-mono text-xs tracking-[0.08em] text-text-muted uppercase">
            Bölüm linki
          </span>
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="YouTube, Dailymotion ya da kanal sitesi linki"
            className="w-full border-b-2 border-screen-line bg-transparent pb-2 text-sm text-text-primary outline-none transition-colors placeholder:text-text-faint focus:border-signal"
          />
          <span className="mt-1 block font-mono text-[10px] text-text-faint">
            YouTube ve Dailymotion linkleri doğrulanır — sadece tam bölüm linkleri kabul edilir,
            fragman/klip reddedilir.
          </span>
        </label>
        <button
          type="submit"
          disabled={validating}
          className="rounded-[3px] border border-dashed border-screen-line px-4 py-2.5 font-mono text-[13px] tracking-[0.04em] text-text-primary transition-colors hover:border-signal hover:bg-signal-soft disabled:opacity-60"
        >
          {validating ? "Doğrulanıyor…" : submitLabel}
        </button>
        {linkError && <FieldError>{linkError}</FieldError>}
        <button
          type="button"
          onClick={() => setMode("search")}
          className="w-full font-mono text-[11px] text-text-muted hover:text-text-primary"
        >
          ← bölüm ara
        </button>
      </form>
    );
  }

  return (
    <div>
      <label className="block">
        <span className="mb-1.5 flex flex-wrap items-center gap-1.5 font-mono text-xs tracking-[0.08em] text-text-muted uppercase">
          Bölüm ara
          {ytChannel && (
            <span className="rounded-full bg-signal-soft px-2 py-0.5 text-[9px] text-signal normal-case">
              YouTube: {ytChannel.channelTitle}
            </span>
          )}
          {dmChannel && (
            <span className="rounded-full bg-sync-soft px-2 py-0.5 text-[9px] text-sync normal-case">
              Dailymotion: {dmChannel.ownerName}
            </span>
          )}
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Örn. 1. bölüm"
          className="w-full border-b-2 border-screen-line bg-transparent pb-2 text-sm text-text-primary outline-none transition-colors placeholder:text-text-faint focus:border-signal"
        />
      </label>

      {searching && <p className="mt-3 font-mono text-xs text-text-muted">Aranıyor…</p>}
      {searchError && <div className="mt-3"><FieldError>{searchError}</FieldError></div>}

      {merged.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          {merged.map((r) => (
            <motion.button
              key={`${r.platform}-${r.videoId}`}
              type="button"
              onClick={() => handleResultPick(r)}
              whileHover={{ x: 3 }}
              className="flex items-center gap-3 rounded border border-screen-line px-2.5 py-2 text-left transition-colors hover:border-signal hover:bg-signal-soft"
            >
              {r.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.thumbnailUrl} alt="" className="h-11 w-[72px] shrink-0 rounded-sm object-cover" />
              ) : (
                <div className="h-11 w-[72px] shrink-0 rounded-sm bg-screen" />
              )}
              <div className="min-w-0 flex-1">
                <div className="line-clamp-1 text-[13px] text-text-primary">{r.title}</div>
                <div className="line-clamp-1 flex items-center gap-1.5 font-mono text-[10px] text-text-muted">
                  <span
                    className={
                      r.platform === "youtube"
                        ? "rounded-sm bg-signal-soft px-1 py-0.5 text-signal"
                        : "rounded-sm bg-sync-soft px-1 py-0.5 text-sync"
                    }
                  >
                    {r.platform === "youtube" ? "YT" : "DM"}
                  </span>
                  {r.sourceLabel}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setMode("link")}
        className="mt-3 font-mono text-[11px] text-text-muted hover:text-text-primary"
      >
        ya da link yapıştır →
      </button>
    </div>
  );
}
