"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import QRCode from "qrcode";

export function InviteQr({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    QRCode.toDataURL(url, {
      width: 220,
      margin: 1,
      color: { dark: "#241522", light: "#f5e6c8" },
    })
      .then((d) => {
        if (!cancelled) setDataUrl(d);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, url]);

  return (
    <div className="relative">
      <motion.button
        onClick={() => setOpen((v) => !v)}
        aria-label="Davet QR kodu"
        aria-expanded={open}
        initial={{ opacity: 0, scale: 0.85, rotate: 3 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 20, delay: 0.3 }}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.97 }}
        className="rounded border border-screen-line bg-screen-glow p-2.5 text-text-muted transition-colors hover:border-signal hover:bg-signal-soft"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20v.01" />
        </svg>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="absolute top-full right-0 z-30 mt-2 w-[240px] rounded-lg border border-screen-line bg-screen-glow p-4 text-center shadow-[0_20px_44px_-16px_rgba(0,0,0,0.75)]"
          >
            <p className="mb-3 font-mono text-[11px] tracking-[0.06em] text-text-muted uppercase">
              Telefonla okut, katıl
            </p>
            <div className="mx-auto flex h-[220px] w-[220px] items-center justify-center overflow-hidden rounded bg-guide">
              {dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={dataUrl} alt="Davet QR kodu" width={220} height={220} />
              ) : (
                <span className="font-mono text-xs text-ink-soft">Hazırlanıyor…</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
