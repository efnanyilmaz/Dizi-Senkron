import type { NextEpisodeInfo } from "@/types/show";

function formatAirDate(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((date.getTime() - today.getTime()) / 86_400_000);

  const label = date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });

  if (days === 0) return `Bugün · ${label}`;
  if (days === 1) return `Yarın · ${label}`;
  if (days > 1 && days <= 7) return `${days} gün sonra · ${label}`;
  if (days < 0) return label;
  return label;
}

export function NextEpisodeBanner({ nextEpisode }: { nextEpisode: NextEpisodeInfo | null }) {
  if (!nextEpisode) return null;

  const isPast = new Date(`${nextEpisode.airDate}T00:00:00`) < new Date(new Date().setHours(0, 0, 0, 0));

  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded border border-dashed border-screen-line bg-screen-glow px-4 py-3 font-mono text-xs text-text-muted">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sync" />
      <span>
        {isPast ? "Son yayınlanan bölüm" : "Sıradaki bölüm"}{" "}
        <span className="text-text-primary">
          S{String(nextEpisode.seasonNumber).padStart(2, "0")}·B
          {String(nextEpisode.episodeNumber).padStart(2, "0")}
        </span>{" "}
        — {formatAirDate(nextEpisode.airDate)}
      </span>
    </div>
  );
}
