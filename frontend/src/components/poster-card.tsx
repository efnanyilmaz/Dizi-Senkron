"use client";

import { motion } from "framer-motion";
import { PosterThumb } from "@/components/poster-thumb";
import { RatingBadge } from "@/components/rating-badge";

export function PosterCard({
  title,
  posterPath,
  year,
  voteAverage,
  isFavorite,
  onToggleFavorite,
  onClick,
  meta,
}: {
  title: string;
  posterPath: string | null;
  year?: number | null;
  voteAverage?: number | null;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onClick?: () => void;
  meta?: string;
}) {
  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      whileHover={{ y: -6, rotate: -1.5 }}
      whileTap={{ scale: 0.98, rotate: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className="group relative w-[150px] shrink-0 cursor-pointer text-left"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md border border-screen-line">
        <PosterThumb title={title} posterPath={posterPath} width={150} height={225} className="h-full w-full" />

        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-screen/95 via-screen/10 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <div className="mb-1 line-clamp-2 text-[13px] font-medium text-text-primary">{title}</div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-text-muted">
            {year}
            <RatingBadge voteAverage={voteAverage ?? null} />
          </div>
        </div>

        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            aria-label={isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}
            className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-screen/80 text-text-primary backdrop-blur-sm transition-colors hover:text-signal"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} className={isFavorite ? "text-signal" : ""}>
              <path d="M6 3h12a1 1 0 0 1 1 1v16l-7-4-7 4V4a1 1 0 0 1 1-1z" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {meta && <div className="mt-1.5 font-mono text-[11px] text-text-muted">{meta}</div>}
    </motion.div>
  );
}
