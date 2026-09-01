"use client";

import { motion } from "framer-motion";
import { PosterThumb } from "@/components/poster-thumb";
import { RatingBadge } from "@/components/rating-badge";

export function PublicGroupCard({
  name,
  showTitle,
  posterPath,
  voteAverage,
  memberCount,
  onJoin,
  joining,
}: {
  name: string;
  showTitle: string;
  posterPath: string | null;
  voteAverage?: number | null;
  memberCount: number;
  onJoin: () => void;
  joining: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className="w-[220px] shrink-0 overflow-hidden rounded-lg bg-guide text-ink shadow-[0_24px_44px_-24px_rgba(0,0,0,0.6)]"
    >
      <div className="flex gap-3 p-4">
        <PosterThumb title={showTitle} posterPath={posterPath} width={48} height={72} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-base leading-tight">{name}</div>
          <div className="mt-0.5 truncate text-[12px] text-ink-soft">{showTitle}</div>
          <div className="mt-1.5">
            <RatingBadge voteAverage={voteAverage ?? null} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-dashed border-guide-edge px-4 py-2.5">
        <span className="font-mono text-[10px] tracking-[0.08em] text-ink-soft/70 uppercase">
          {memberCount} üye
        </span>
        <button
          onClick={onJoin}
          disabled={joining}
          className="rounded-[3px] border border-dashed border-ink/30 px-3 py-1.5 font-mono text-[11px] tracking-[0.04em] transition-colors hover:bg-ink hover:text-guide disabled:opacity-50"
        >
          {joining ? "Katılıyor…" : "Katıl"}
        </button>
      </div>
    </motion.div>
  );
}
