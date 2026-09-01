"use client";

import { motion } from "framer-motion";

export function RatingBadge({ voteAverage }: { voteAverage: number | null }) {
  if (voteAverage == null) return null;

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.4, rotate: -14 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 20 }}
      className="inline-flex items-center gap-1 rounded-full bg-rating-soft px-2 py-0.5 font-mono text-[11px] font-medium text-rating"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2.5l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.8-6.2 3.8 1.6-7-5.4-4.7 7.1-.6z" />
      </svg>
      {voteAverage.toFixed(1)}
    </motion.span>
  );
}
