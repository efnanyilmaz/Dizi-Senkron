"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const members = ["Elif", "Mira", "Bulut"];

export function WatchTogetherDemo() {
  const [playing, setPlaying] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  function toggle() {
    setPlaying((v) => !v);
    setJustSynced(true);
    window.setTimeout(() => setJustSynced(false), 1400);
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mx-auto w-full max-w-[1180px] px-8 pb-24"
    >
      <div className="grid grid-cols-[1fr_1fr] items-center gap-14 max-[880px]:grid-cols-1 max-[880px]:gap-8">
        <div className="overflow-hidden rounded-lg border border-screen-line bg-screen-glow shadow-[0_40px_80px_-40px_rgba(0,0,0,0.7)] max-[880px]:order-2">
          <div className="flex items-center justify-between border-b border-dashed border-screen-line px-5 py-4 font-mono text-xs tracking-[0.1em] text-text-caption uppercase">
            <span>İzleme odası</span>
            <span className="inline-flex items-center gap-1.5 text-sync">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sync" />
              3 kişi senkron
            </span>
          </div>

          <div className="p-5">
            <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-md bg-ink">
              <button
                onClick={toggle}
                aria-label={playing ? "Duraklat" : "Oynat"}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-guide text-ink shadow-[0_8px_20px_-6px_rgba(0,0,0,0.6)] transition-transform hover:scale-105"
              >
                {playing ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <rect x="5" y="4" width="5" height="16" />
                    <rect x="14" y="4" width="5" height="16" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M7 4l14 8-14 8V4z" />
                  </svg>
                )}
              </button>

              <div className="absolute inset-x-3 bottom-3 h-1 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-sync"
                  animate={playing ? { width: ["18%", "100%"] } : { width: "18%" }}
                  transition={playing ? { duration: 9, ease: "linear" } : { duration: 0.3 }}
                />
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {members.map((name) => (
                <div
                  key={name}
                  className="flex items-center justify-between font-mono text-[12px] text-text-secondary"
                >
                  <span>{name}</span>
                  <motion.span
                    key={`${name}-${playing}`}
                    initial={{ opacity: 0.3 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="tabular-nums text-text-muted"
                  >
                    {playing ? "▶ 12:47" : "⏸ 12:47"}
                  </motion.span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative border-t border-dashed border-screen-line px-5 py-3 font-mono text-[11px] text-text-muted">
            <span className={justSynced ? "opacity-0" : undefined}>
              youtube oynatılamazsa dailymotion&apos;a geçilir, o da yoksa ortak zaman modu devreye girer
            </span>
            <AnimatePresence>
              {justSynced && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-y-0 left-5 flex items-center text-sync"
                >
                  az önce herkese anında yayıldı ✓
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="max-[880px]:order-1">
          <div className="mb-3.5 font-mono text-xs tracking-[0.16em] text-text-muted uppercase">
            Canlı senkron
          </div>
          <h2 className="mb-4 font-display text-[clamp(26px,3vw,34px)] text-balance text-text-primary">
            Biri oynatınca, herkeste aynı anda oynar.
          </h2>
          <p className="max-w-[46ch] text-[15px] leading-relaxed text-text-secondary">
            Play, durdur, ileri sar: hepsi grubunun ekranına anında yansır. Soldaki düğmeye bas,
            üç arkadaşının aynı anda senkronlandığını gör.
          </p>
        </div>
      </div>
    </motion.section>
  );
}
