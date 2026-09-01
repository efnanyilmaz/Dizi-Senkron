"use client";

import { motion } from "framer-motion";

function MarqueeBulbs() {
  const bulbs = Array.from({ length: 5 });
  return (
    <div className="flex items-center gap-2">
      {bulbs.map((_, i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-signal"
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

const tickerPhrases = ["Grup oluştur", "İlk bölümü işaretle", "Spoiler yok", "Ücretsiz"];

function Ticker() {
  const items = [...tickerPhrases, ...tickerPhrases];
  return (
    <div className="overflow-hidden border-y border-screen-line/60 py-2">
      <div className="flex w-max animate-marquee-scroll gap-8 will-change-transform motion-reduce:animate-none">
        {[...items, ...items].map((phrase, i) => (
          <span
            key={i}
            lang="tr"
            className="flex shrink-0 items-center gap-8 font-mono text-[11px] tracking-[0.14em] text-text-muted uppercase"
          >
            <span className="text-signal">★</span>
            {phrase}
          </span>
        ))}
      </div>
    </div>
  );
}

const seatTags = ["S02·B07", "S02·B04", "S01·B11"];

function SeatTags() {
  return (
    <div className="flex -space-x-1.5">
      {seatTags.map((seat, i) => (
        <span
          key={seat}
          style={{ zIndex: seatTags.length - i }}
          className="rounded-sm border border-guide-edge/40 bg-screen-glow px-1.5 py-0.5 font-mono text-[9px] tabular-nums text-guide"
        >
          {seat}
        </span>
      ))}
    </div>
  );
}

function HolePunch() {
  return <span className="inline-block h-1.5 w-1.5 rounded-full border border-guide-edge/40" />;
}

export function FinalCta() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mx-auto w-full max-w-[1180px] px-8 pb-24"
    >
      <div className="relative overflow-hidden rounded-lg border border-screen-line bg-screen-glow">
        <div className="sprocket-strip sprocket-strip-live" />

        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 620px 320px at 15% 0%, rgba(168,123,250,0.16), transparent 60%), radial-gradient(ellipse 620px 320px at 85% 100%, rgba(122,61,168,0.18), transparent 60%)",
          }}
        />

        <div className="relative flex flex-col items-center gap-7 px-10 pt-10 pb-8 text-center max-[700px]:px-6 max-[700px]:pt-8">
          <MarqueeBulbs />

          <div>
            <div className="mb-3 font-mono text-xs tracking-[0.24em] text-signal uppercase">
              Perde açılıyor
            </div>
            <h2 className="max-w-[22ch] font-display text-[clamp(30px,4.4vw,52px)] leading-[1.02] text-balance text-guide">
              Grubunu kur, ilk bölümü işaretle.
            </h2>
          </div>

          <a
            href="/kayit"
            className="inline-flex shrink-0 items-center gap-2.5 rounded-lg bg-guide px-8 py-4 font-semibold text-ink shadow-[0_10px_28px_-10px_rgba(255,210,63,0.35)] transition-transform hover:-translate-y-0.5"
          >
            Grup oluştur →
          </a>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-mono text-[11px] tracking-[0.06em] text-text-muted uppercase">
            <span className="flex items-center gap-2">
              <SeatTags />
              Sınırsız grup
            </span>
            <HolePunch />
            <span>Ücretsiz</span>
            <HolePunch />
            <span>Anında davet kodu</span>
          </div>

          <MarqueeBulbs />
        </div>

        <Ticker />
        <div className="sprocket-strip sprocket-strip-live" />
      </div>
    </motion.section>
  );
}
