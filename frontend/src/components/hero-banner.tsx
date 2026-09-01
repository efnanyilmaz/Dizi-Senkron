"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { RatingBadge } from "@/components/rating-badge";
import { backdropUrl } from "@/lib/tmdb-image";

export function HeroBanner({
  id,
  eyebrow,
  title,
  subtitle,
  backdropPath,
  voteAverage,
  actionLabel,
  onAction,
}: {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  backdropPath: string | null;
  voteAverage?: number | null;
  actionLabel: string;
  onAction: () => void;
}) {
  const backdrop = backdropUrl(backdropPath, "original");

  return (
    <div className="relative mb-10 h-[360px] overflow-hidden rounded-lg border border-screen-line max-[700px]:h-[300px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={id}
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute inset-0"
        >
          {backdrop && <Image src={backdrop} alt="" fill priority sizes="1180px" className="object-cover" />}
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-to-t from-screen via-screen/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-screen/70 via-transparent to-transparent" />

      <div className="sprocket-strip sprocket-strip-live absolute inset-x-0 top-0 z-10" />
      <div className="sprocket-strip sprocket-strip-live absolute inset-x-0 bottom-0 z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="absolute inset-x-0 bottom-0 px-8 pb-8 max-[700px]:px-5 max-[700px]:pb-6"
      >
        <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-signal-soft px-3 py-1.5 font-mono text-xs tracking-[0.16em] text-signal uppercase">
          <span className="h-1.5 w-1.5 animate-signal-pulse rounded-full bg-signal" />
          {eyebrow}
        </span>
        <h1 className="mb-2 max-w-xl font-display text-4xl text-balance text-text-primary max-[700px]:text-3xl">
          {title}
        </h1>
        <div className="mb-5 flex items-center gap-3 font-mono text-sm text-text-secondary">
          {subtitle}
          <RatingBadge voteAverage={voteAverage ?? null} />
        </div>
        <button
          onClick={onAction}
          className="marquee-border inline-flex items-center gap-2 rounded-lg bg-guide px-6 py-3 font-semibold text-ink transition-transform hover:-translate-y-0.5"
        >
          {actionLabel}
        </button>
      </motion.div>
    </div>
  );
}
