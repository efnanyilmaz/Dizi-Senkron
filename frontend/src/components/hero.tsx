"use client";

import { motion, type Variants } from "framer-motion";
import { SyncTicker, type MemberProgress } from "./sync-ticker";

const demoMembers: MemberProgress[] = [
  {
    id: "mira",
    name: "Mira",
    avatarColor: "#f2c265",
    joinedLabel: "14 hafta önce katıldı",
    season: 2,
    episode: 7,
    segmentsOn: 7,
    status: "sync",
  },
  {
    id: "bulut",
    name: "Bulut",
    avatarColor: "#7fd1c4",
    joinedLabel: "14 hafta önce katıldı",
    season: 2,
    episode: 4,
    segmentsOn: 4,
    status: "behind",
    behindBy: 3,
  },
  {
    id: "elif",
    name: "Elif",
    avatarColor: "#e38b8b",
    joinedLabel: "9 hafta önce katıldı",
    season: 2,
    episode: 7,
    segmentsOn: 7,
    status: "sync",
  },
  {
    id: "deniz",
    name: "Deniz",
    avatarColor: "#9ca8e3",
    joinedLabel: "3 hafta önce katıldı",
    season: 1,
    episode: 11,
    segmentsOn: 2,
    status: "behind",
    behindBy: 9,
  },
];

const cardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.65,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const focusIn: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(7px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

export function Hero() {
  return (
    <section className="mx-auto grid w-full max-w-[1180px] grid-cols-[1fr_1.05fr] items-center gap-14 px-8 py-24 max-[880px]:grid-cols-1 max-[880px]:py-11">
      <motion.div
        initial="hidden"
        animate="show"
        variants={cardVariants}
        className="relative overflow-hidden rounded-tl-[18px] rounded-tr-[18px] rounded-br-[6px] rounded-bl-[18px] bg-guide text-ink shadow-[0_30px_60px_-25px_rgba(0,0,0,0.55),0_2px_0_rgba(0,0,0,0.2)] max-[880px]:rounded-2xl"
      >
        <motion.div
          aria-hidden
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.45, ease: "easeOut" }}
          className="pointer-events-none absolute inset-0 z-20 bg-[#fbf6ea]"
        />

        <div className="sprocket-strip sprocket-strip-live" />

        <div className="px-10 py-9 max-[880px]:px-7 max-[880px]:py-7">
          <motion.span
            variants={fadeUp}
            className="mb-5.5 inline-flex items-center gap-2 rounded-full bg-signal-soft px-3 py-1.5 font-mono text-xs tracking-[0.16em] text-[#8a5a2c] uppercase"
          >
            <span className="h-1.5 w-1.5 animate-signal-pulse rounded-full bg-signal" />
            Şu an senkron — 4 grup canlı
          </motion.span>

          <motion.h1
            variants={focusIn}
            className="mb-5 font-display text-[clamp(34px,4.4vw,52px)] leading-[1.05] text-balance"
          >
            Herkes izliyor.
            <br />
            Kimse <span className="text-[#b85c1f]">spoiler</span> yemiyor.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mb-8 max-w-[44ch] text-[17px] leading-relaxed text-ink-soft"
          >
            Arkadaş grubundaki herkesin hangi bölümde olduğunu her an görürsün, sohbet de kimsenin
            önüne geçmeden akar.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-5">
            <a
              href="/kayit"
              className="marquee-border inline-flex items-center gap-2.5 rounded-lg bg-ink px-6 py-3.5 font-semibold text-guide shadow-[0_8px_20px_-10px_rgba(34,32,27,0.5)] transition-transform hover:-translate-y-0.5"
            >
              Grup oluştur →
            </a>
            <a
              href="#nasil-calisir"
              className="border-b border-dashed border-guide-edge pb-0.5 font-mono text-[13px] tracking-[0.04em] text-ink-soft transition-colors hover:border-ink-soft hover:text-ink"
            >
              Nasıl çalıştığını gör
            </a>
          </motion.div>
        </div>

        <div className="sprocket-strip sprocket-strip-live" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
      >
        <SyncTicker showTitle="Medcezir" showSubtitle="grup takibi" members={demoMembers} />
      </motion.div>
    </section>
  );
}
