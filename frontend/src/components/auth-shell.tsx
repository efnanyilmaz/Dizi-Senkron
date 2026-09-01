"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-[calc(100vh-96px)] items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut", delay: 0.08 }}
        >
          {children}
        </motion.div>
      </div>
    </main>
  );
}
