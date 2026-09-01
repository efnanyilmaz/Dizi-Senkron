"use client";

import { motion } from "framer-motion";

const stripes = {
  backgroundImage: "repeating-linear-gradient(-45deg, var(--guide) 0 8px, var(--ink) 8px 16px)",
};

export function ClapperLoader({ label = "Yükleniyor" }: { label?: string }) {
  return (
    <div className="flex items-center gap-4 font-mono text-sm text-text-muted">
      <div className="relative h-[46px] w-[62px] shrink-0">
        <div
          className="absolute inset-x-0 bottom-0 flex h-[30px] items-end justify-center rounded-b-[3px] rounded-t-[2px] border border-black/25 pb-1"
          style={stripes}
        >
          <span className="rounded-sm bg-black/55 px-1.5 py-[1px] text-[7px] leading-none tracking-[0.08em] text-guide uppercase">
            Senkron
          </span>
        </div>
        <motion.div
          className="absolute inset-x-0 top-0 h-4 origin-bottom-left rounded-t-[3px] border border-black/25"
          style={stripes}
          animate={{ rotate: [-26, -26, 0, 0, -26] }}
          transition={{
            duration: 1.7,
            times: [0, 0.16, 0.34, 0.86, 1],
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>
      <span>{label}…</span>
    </div>
  );
}
