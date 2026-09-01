"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { MiniClapper } from "@/components/mini-clapper";

type Me = { id: string; displayName: string };

export function SiteHeader() {
  const [me, setMe] = useState<Me | null>(null);
  const [checked, setChecked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    apiFetch<Me | null>("/auth/me")
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setChecked(true));
  }, []);

  return (
    <header className="relative mx-auto w-full max-w-[1180px] px-8 pt-7">
      <div className="flex items-center justify-between gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-mono text-xs font-semibold tracking-[0.14em] text-text-primary transition-colors hover:text-signal sm:gap-2.5 sm:text-sm sm:tracking-[0.22em]"
        >
          <Image
            src="/logo-icon.png"
            alt="Dizi Senkron"
            width={24}
            height={24}
            className="h-6 w-6 shrink-0 rounded-[6px]"
            priority
          />
          DİZİ SENKRON
        </Link>

        <nav className="flex items-center gap-4 text-sm sm:gap-8">
          <a
            href="/kesfet"
            className="hidden text-text-muted transition-colors hover:text-text-primary sm:inline"
          >
            Keşfet
          </a>
          <a
            href="/gruplarim"
            className="hidden text-text-muted transition-colors hover:text-text-primary sm:inline"
          >
            Gruplarım
          </a>

          {checked ? (
            <motion.a
              key={me ? "me" : "giris"}
              href={me ? "/profil" : "/giris"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="rounded-[3px] border border-screen-line px-3 py-2 font-mono text-xs tracking-[0.04em] text-text-primary transition-colors hover:border-signal hover:bg-signal-soft sm:px-4 sm:py-2.5 sm:text-[13px]"
            >
              {me ? me.displayName : "Giriş yap"}
            </motion.a>
          ) : (
            <div className="flex h-[33px] items-center justify-center sm:h-[39px]">
              <MiniClapper duration={1.6} />
            </div>
          )}

          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menüyü aç"
            aria-expanded={menuOpen}
            className="relative flex h-8 w-8 items-center justify-center sm:hidden"
          >
            <motion.div
              animate={{ opacity: menuOpen ? 0 : 1, scale: menuOpen ? 0.6 : 1 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-[5px]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-text-primary" />
              <span className="h-1.5 w-1.5 rounded-full bg-text-primary" />
              <span className="h-1.5 w-1.5 rounded-full bg-text-primary" />
            </motion.div>
            <motion.div
              animate={{ opacity: menuOpen ? 1 : 0, scale: menuOpen ? 1 : 0.6 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="absolute h-[2px] w-5 rotate-45 bg-text-primary" />
              <span className="absolute h-[2px] w-5 -rotate-45 bg-text-primary" />
            </motion.div>
          </button>
        </nav>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden sm:hidden"
          >
            <div className="mt-4 flex flex-col gap-2">
              <a
                href="/kesfet"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg border border-dashed border-screen-line bg-screen-glow px-4 py-3 font-mono text-sm text-text-secondary"
              >
                Keşfet
              </a>
              <a
                href="/gruplarim"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg border border-dashed border-screen-line bg-screen-glow px-4 py-3 font-mono text-sm text-text-secondary"
              >
                Gruplarım
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
