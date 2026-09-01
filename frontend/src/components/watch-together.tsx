"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { loadYoutubeApi } from "@/lib/load-youtube-api";
import { getSocket } from "@/lib/socket";
import { parseEpisodeNumber } from "@/lib/youtube";
import { UtilityPanel } from "@/components/utility-panel";
import { YoutubeSearchPicker, type PickedVideo } from "@/components/youtube-search-picker";

export type WatchPosition = { userId: string; displayName: string; positionLabel: string };

// "Şu an neredeyim" — otomatik senkronu olmayan modlarda (harici link,
// Dailymotion) üyeler kendi izledikleri dakikayı elle paylaşır. Otomatik
// değil ama gerçek bir "aynı yerdeyiz" hissi verir.
function PositionShare({
  positions,
  myUserId,
  onSharePosition,
}: {
  positions: WatchPosition[];
  myUserId: string;
  onSharePosition: (positionLabel: string) => void;
}) {
  const [positionInput, setPositionInput] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = positionInput.trim();
    if (!trimmed) return;
    onSharePosition(trimmed);
    setPositionInput("");
  }

  const others = positions.filter((p) => p.userId !== myUserId);

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1">
          <span className="mb-1.5 block font-mono text-xs tracking-[0.08em] text-text-muted uppercase">
            Şu an neredeyim
          </span>
          <input
            value={positionInput}
            onChange={(e) => setPositionInput(e.target.value)}
            placeholder="örn. 24:15"
            maxLength={20}
            className="w-full border-b-2 border-screen-line bg-transparent pb-2 text-sm text-text-primary outline-none transition-colors placeholder:text-text-faint focus:border-signal"
          />
        </label>
        <button
          type="submit"
          className="rounded-[3px] border border-dashed border-screen-line px-4 py-2.5 font-mono text-[13px] tracking-[0.04em] text-text-primary transition-colors hover:border-signal hover:bg-signal-soft"
        >
          Paylaş
        </button>
      </form>

      {others.length > 0 && (
        <div className="space-y-1.5">
          {others.map((p) => (
            <div
              key={p.userId}
              className="flex items-center justify-between rounded border border-screen-line bg-screen px-3 py-2 font-mono text-xs"
            >
              <span className="text-text-secondary">{p.displayName}</span>
              <span className="text-signal">{p.positionLabel}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Video hiçbir yerde gömülemiyorsa (YouTube'da video sahibi kapatmışsa, ya da
// hiç tanınan bir platformdan gelmeyip bir kanal sitesinden yapıştırılmışsa)
// gerçek bir oynatıcı koyamayız — bunun yerine herkes videoyu kendi
// sekmesinde açar.
function ExternalLinkPanel({
  openUrl,
  positions,
  myUserId,
  onSharePosition,
}: {
  openUrl: string;
  positions: WatchPosition[];
  myUserId: string;
  onSharePosition: (positionLabel: string) => void;
}) {
  return (
    <div className="space-y-4 p-4">
      <div className="rounded border border-dashed border-screen-line bg-screen px-4 py-3">
        <p className="mb-2.5 text-sm text-text-secondary">
          Bu video burada oynatılamıyor. Kendi sekmende aç, ne kadarda olduğunu aşağıdan paylaş.
        </p>
        <a
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-[3px] border border-screen-line px-4 py-2 font-mono text-[13px] text-text-primary transition-colors hover:border-signal hover:bg-signal-soft"
        >
          Videoyu aç ↗
        </a>
      </div>
      <PositionShare positions={positions} myUserId={myUserId} onSharePosition={onSharePosition} />
    </div>
  );
}

export function WatchTogether({
  groupId,
  videoId,
  dailymotionId,
  externalUrl,
  embeddable,
  showTitle,
  tmdbId,
  positions,
  myUserId,
  onEpisodeDetected,
  onSharePosition,
}: {
  groupId: string;
  videoId: string | null;
  dailymotionId: string | null;
  externalUrl: string | null;
  embeddable: boolean;
  showTitle: string;
  tmdbId?: number | null;
  positions: WatchPosition[];
  myUserId: string;
  onEpisodeDetected?: (episode: number) => void;
  onSharePosition: (positionLabel: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  // Uzaktan gelen bir komutu uygularken (seekTo + play/pause) YouTube birden fazla
  // ardışık durum değişikliği tetikleyebiliyor (örn. buffering -> playing). Tek seferlik
  // bir bayrak yalnızca ilkini yutup ikincisinin geri yayınlanmasına (ve iki üyenin
  // birbirini sonsuz döngüde aynı noktaya geri sarmasına) yol açıyordu — bunun yerine
  // kısa bir zaman penceresi boyunca tüm kendi kaynaklı olayları yok sayıyoruz.
  const suppressUntilRef = useRef(0);
  const SUPPRESS_WINDOW_MS = 1200;

  useEffect(() => {
    if (!videoId || !embeddable) return;
    let cancelled = false;

    loadYoutubeApi().then((YT) => {
      if (cancelled || !containerRef.current) return;

      if (playerRef.current) {
        suppressUntilRef.current = Date.now() + SUPPRESS_WINDOW_MS;
        playerRef.current.loadVideoById(videoId);
        return;
      }

      playerRef.current = new YT.Player(containerRef.current, {
        videoId,
        playerVars: { rel: 0 },
        events: {
          onStateChange: (event) => {
            if (Date.now() < suppressUntilRef.current) return;
            const player = playerRef.current;
            if (!player) return;

            if (event.data === YT.PlayerState.PLAYING) {
              getSocket().emit("player_action", {
                groupId,
                action: "play",
                positionSeconds: player.getCurrentTime(),
              });
            } else if (event.data === YT.PlayerState.PAUSED) {
              getSocket().emit("player_action", {
                groupId,
                action: "pause",
                positionSeconds: player.getCurrentTime(),
              });
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [videoId, embeddable, groupId]);

  useEffect(() => {
    const socket = getSocket();

    function handleRemoteAction({
      action,
      positionSeconds,
    }: {
      action: "play" | "pause";
      positionSeconds: number;
    }) {
      const player = playerRef.current;
      if (!player) return;
      suppressUntilRef.current = Date.now() + SUPPRESS_WINDOW_MS;
      player.seekTo(positionSeconds, true);
      if (action === "play") player.playVideo();
      else player.pauseVideo();
    }

    socket.on("player_action", handleRemoteAction);
    return () => {
      socket.off("player_action", handleRemoteAction);
    };
  }, []);

  function handlePick(picked: PickedVideo) {
    getSocket().emit("set_video", {
      groupId,
      videoId: picked.videoId,
      dailymotionId: picked.dailymotionId,
      externalUrl: picked.externalUrl,
      embeddable: picked.embeddable,
    });
    const episode = parseEpisodeNumber(picked.title);
    if (episode) onEpisodeDetected?.(episode);
  }

  if (!videoId && !dailymotionId && !externalUrl) {
    return (
      <div className="rounded border border-dashed border-screen-line bg-screen-glow px-5 py-4">
        <div className="mb-3 font-mono text-xs tracking-[0.08em] text-text-muted uppercase">
          Birlikte izle
        </div>
        <YoutubeSearchPicker showTitle={showTitle} tmdbId={tmdbId} onPick={handlePick} />
      </div>
    );
  }

  if (!embeddable) {
    const openUrl = videoId
      ? `https://youtu.be/${videoId}`
      : dailymotionId
        ? `https://dai.ly/${dailymotionId}`
        : externalUrl!;
    return (
      <UtilityPanel label="Birlikte izle — harici link" noPadding>
        <ExternalLinkPanel
          openUrl={openUrl}
          positions={positions}
          myUserId={myUserId}
          onSharePosition={onSharePosition}
        />
        <div className="border-t border-dashed border-screen-line p-4">
          <YoutubeSearchPicker showTitle={showTitle} tmdbId={tmdbId} onPick={handlePick} submitLabel="Değiştir" />
        </div>
      </UtilityPanel>
    );
  }

  if (dailymotionId) {
    // Dailymotion'ın YouTube'unki gibi bir olay API'si kurulu değil — video
    // gerçekten sitede oynuyor ama play/pause otomatik senkronlanmıyor, bu
    // yüzden altında "neredeyim" paylaşımı da gösterilir.
    return (
      <UtilityPanel label="Birlikte izleniyor · Dailymotion" noPadding>
        <div className="aspect-video w-full">
          <iframe
            src={`https://geo.dailymotion.com/player.html?video=${dailymotionId}`}
            className="h-full w-full"
            allow="autoplay; fullscreen; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        <div className="border-t border-dashed border-screen-line p-4">
          <PositionShare positions={positions} myUserId={myUserId} onSharePosition={onSharePosition} />
        </div>
        <div className="border-t border-dashed border-screen-line p-4">
          <YoutubeSearchPicker showTitle={showTitle} tmdbId={tmdbId} onPick={handlePick} submitLabel="Değiştir" />
        </div>
      </UtilityPanel>
    );
  }

  return (
    <UtilityPanel label="Birlikte izleniyor" noPadding>
      <div className="aspect-video w-full" ref={containerRef} />
      <div className="border-t border-dashed border-screen-line p-4">
        <YoutubeSearchPicker showTitle={showTitle} tmdbId={tmdbId} onPick={handlePick} submitLabel="Değiştir" />
      </div>
    </UtilityPanel>
  );
}
