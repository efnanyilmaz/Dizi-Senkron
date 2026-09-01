"use client";

import { motion } from "framer-motion";
import { PosterThumb } from "@/components/poster-thumb";
import { RatingBadge } from "@/components/rating-badge";

const avatarColors = ["#f2c265", "#7fd1c4", "#e38b8b", "#9ca8e3", "#c9a6d1"];
const DEFAULT_SEGMENTS = 10;

function Notch({ side }: { side: "left" | "right" }) {
  return (
    <span
      className={`absolute -top-1.5 h-3 w-3 rounded-full bg-screen ${
        side === "left" ? "-left-1.5" : "-right-1.5"
      }`}
    />
  );
}

export function GroupTicketCard({
  name,
  showTitle,
  posterPath,
  voteAverage,
  season,
  episode,
  memberCount,
  inviteCode,
  totalSeasons,
  totalEpisodes,
  onClick,
}: {
  name: string;
  showTitle: string;
  posterPath: string | null;
  voteAverage?: number | null;
  season: number;
  episode: number;
  memberCount: number;
  inviteCode: string;
  totalSeasons?: number | null;
  totalEpisodes?: number | null;
  onClick: () => void;
}) {
  // Dizinin sezon başına ortalama bölüm sayısı bilinmiyorsa (TMDB'den henüz
  // veri gelmemişse) sabit bir ölçeğe düşülür.
  const totalSegments =
    totalSeasons && totalEpisodes ? Math.max(1, Math.round(totalEpisodes / totalSeasons)) : DEFAULT_SEGMENTS;
  const filled = Math.min(episode, totalSegments);

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className="w-[270px] shrink-0 overflow-hidden rounded-lg bg-guide text-left text-ink shadow-[0_24px_44px_-24px_rgba(0,0,0,0.6)]"
    >
      <div className="flex gap-3 p-4">
        <PosterThumb title={showTitle} posterPath={posterPath} width={52} height={78} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-lg leading-tight">{name}</div>
          <div className="mt-0.5 truncate text-[12px] text-ink-soft">{showTitle}</div>
          <div className="mt-1.5">
            <RatingBadge voteAverage={voteAverage ?? null} />
          </div>
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] tracking-[0.08em] text-ink-soft uppercase">
          <span>
            S{String(season).padStart(2, "0")}·B{String(episode).padStart(2, "0")}
          </span>
          <span className="flex -space-x-1.5">
            {Array.from({ length: Math.min(memberCount, 4) }).map((_, i) => (
              <span
                key={i}
                className="h-4 w-4 rounded-full border border-guide"
                style={{ background: avatarColors[i % avatarColors.length] }}
              />
            ))}
            {memberCount > 4 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-guide bg-ink text-[7px] font-semibold text-guide">
                +{memberCount - 4}
              </span>
            )}
          </span>
        </div>
        <div className="flex gap-[3px]">
          {Array.from({ length: totalSegments }).map((_, i) => (
            <i
              key={i}
              className="h-2.5 flex-1 rounded-[1px]"
              style={{ background: i < filled ? "var(--sync)" : "var(--guide-edge)" }}
            />
          ))}
        </div>
      </div>

      <div className="relative border-t border-dashed border-guide-edge px-4 py-2.5">
        <Notch side="left" />
        <Notch side="right" />
        <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.1em] text-ink-soft/70 uppercase">
          <span>{memberCount} üye</span>
          <span>{inviteCode}</span>
        </div>
      </div>
    </motion.button>
  );
}
