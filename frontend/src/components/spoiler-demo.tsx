"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const messages = [
  { author: "Elif", time: "21:04", content: "Bölüm 7'ye yeni başladım, harika gidiyor 👀" },
  { author: "Mira", time: "21:06", content: "Sonuna kadar izle, gerçekten şaşıracaksın." },
];

const spoilerMessage = {
  author: "Bulut",
  time: "21:11",
  content: "Yok artık, o karakterin gerçek kimliği ortaya çıkınca çığlık attım!!",
};

export function SpoilerDemo() {
  const [revealed, setRevealed] = useState(false);

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mx-auto w-full max-w-[1180px] px-8 pb-24"
    >
      <div className="grid grid-cols-[1fr_1fr] items-center gap-14 max-[880px]:grid-cols-1 max-[880px]:gap-8">
        <div>
          <div className="mb-3.5 font-mono text-xs tracking-[0.16em] text-text-muted uppercase">
            Örnek görünüm
          </div>
          <h2 className="mb-4 font-display text-[clamp(26px,3vw,34px)] text-balance text-text-primary">
            Sen 4. bölümdesin. Arkadaşın 7&apos;de. Yine de konuşabilirsiniz.
          </h2>
          <p className="max-w-[46ch] text-[15px] leading-relaxed text-text-secondary">
            Seni geride bırakan mesajlar otomatik olarak bulanıklaşır. Aşağıdaki gizli mesaja
            tıklayıp ne olduğunu görebilirsin, ama bir daha geri alamazsın.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-screen-line bg-screen-glow shadow-[0_40px_80px_-40px_rgba(0,0,0,0.7)]">
          <div className="flex items-center justify-between border-b border-dashed border-screen-line px-5 py-4 font-mono text-xs tracking-[0.1em] text-text-caption uppercase">
            <span>Grup sohbeti</span>
            <span className="text-text-muted">sen: 4. bölüm</span>
          </div>

          <div className="space-y-4 px-5 py-5">
            {messages.map((m) => (
              <div key={m.author}>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-text-primary">{m.author}</span>
                  <span className="font-mono text-[11px] tabular-nums text-text-faint">{m.time}</span>
                </div>
                <p className="mt-0.5 text-[14px] leading-relaxed text-text-secondary">{m.content}</p>
              </div>
            ))}

            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-text-primary">{spoilerMessage.author}</span>
                <span className="font-mono text-[11px] tabular-nums text-text-faint">
                  {spoilerMessage.time}
                </span>
              </div>

              <button
                onClick={() => setRevealed(true)}
                disabled={revealed}
                className="mt-1.5 block w-full text-left"
              >
                <motion.p
                  animate={{ filter: revealed ? "blur(0px)" : "blur(7px)" }}
                  transition={{ duration: 0.4 }}
                  className="select-none text-[14px] leading-relaxed text-text-secondary"
                >
                  {spoilerMessage.content}
                </motion.p>
                {!revealed && (
                  <motion.span
                    initial={false}
                    className="mt-2 inline-flex items-center gap-2 rounded-full bg-signal-soft px-3 py-1.5 font-mono text-[11px] tracking-[0.08em] text-signal uppercase"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                      <rect x="3" y="6" width="18" height="12" rx="2" />
                      <path d="M3 10l18-4M3 14l18 4" />
                    </svg>
                    7. bölüm spoiler&apos;ı · göster
                  </motion.span>
                )}
              </button>
            </div>
          </div>

          <div className="border-t border-dashed border-screen-line px-5 py-3 font-mono text-[11px] text-text-muted">
            spoiler koruması bölümüne göre otomatik ayarlanır
          </div>
        </div>
      </div>
    </motion.section>
  );
}
