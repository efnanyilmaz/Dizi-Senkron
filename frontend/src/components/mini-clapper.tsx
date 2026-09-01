"use client";

import { motion } from "framer-motion";

const stripes = {
  backgroundImage: "repeating-linear-gradient(-45deg, var(--guide) 0 5px, var(--ink) 5px 10px)",
};

export function MiniClapper({ duration = 5 }: { duration?: number }) {
  return (
    <div className="relative h-[22px] w-[28px] shrink-0">
      <div
        className="absolute inset-x-0 bottom-0 h-[14px] rounded-b-[2px] rounded-t-[1px] border border-black/25"
        style={stripes}
      />
      <motion.div
        className="absolute inset-x-0 top-0 h-[8px] origin-bottom-left rounded-t-[2px] border border-black/25"
        style={stripes}
        animate={{ rotate: [0, 0, -30, -30, 0] }}
        transition={{
          duration,
          times: [0, 0.72, 0.82, 0.9, 1],
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
