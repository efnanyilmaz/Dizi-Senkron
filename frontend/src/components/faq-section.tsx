"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const faqs = [
  {
    q: "Dizi Senkron ücretsiz mi?",
    a: "Evet. Grup oluşturmak, arkadaşlarını davet etmek ve tüm özellikleri kullanmak tamamen ücretsiz.",
  },
  {
    q: "Arkadaşımı nasıl davet ederim?",
    a: "Grup oluşturduğunda otomatik bir davet kodu üretilir. Bu kodu veya bağlantıyı paylaşman yeterli — arkadaşın tıklayıp gruba katılır.",
  },
  {
    q: "Hangi diziler destekleniyor?",
    a: "Şimdilik Türk yapımı dizilere odaklanıyoruz — trend olanları ve arşiv klasiklerini kapsıyoruz. Listede olmayan bir dizi için grup yine de oluşturabilirsin.",
  },
  {
    q: "Spoiler nasıl engelleniyor?",
    a: "Her üyenin bıraktığı bölüm bilgisi tutulur. Senden ilerideki biri bir şey yazdığında, sen o bölüme gelene kadar mesaj bulanık gösterilir — istersen erken açabilirsin, risk sana ait.",
  },
  {
    q: "Birlikte izleme nasıl çalışıyor?",
    a: "Grup üyelerinden biri bir bölüm başlattığında oynat, durdur ve ileri-geri sarma herkesin ekranına anında yansır. YouTube video gömmeye izin vermiyorsa Dailymotion'da arama yapılır; o da bulunamazsa herkes kendi zamanını paylaşarak izler.",
  },
];

function ChevronNotch({ open }: { open: boolean }) {
  return (
    <motion.svg
      animate={{ rotate: open ? 180 : 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      className="mt-0.5 shrink-0 text-signal"
    >
      <path d="M6 9l6 6 6-6" />
    </motion.svg>
  );
}

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mx-auto w-full max-w-[980px] px-8 pb-24"
    >
      <div className="mb-10 text-center">
        <div className="mb-3.5 font-mono text-xs tracking-[0.16em] text-text-muted uppercase">
          Sorulan sorular
        </div>
        <h2 className="font-display text-[clamp(26px,3vw,34px)] text-balance text-text-primary">
          Merak ettiklerin
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-4 max-[680px]:grid-cols-1">
        {faqs.map((item, i) => {
          const open = openIndex === i;
          const isLast = i === faqs.length - 1 && faqs.length % 2 !== 0;
          return (
            <div
              key={item.q}
              className={`overflow-hidden rounded-lg border border-screen-line bg-screen-glow transition-colors ${
                open ? "border-signal/40" : ""
              } ${isLast ? "col-span-2 max-[680px]:col-span-1" : ""}`}
            >
              <button
                onClick={() => setOpenIndex(open ? null : i)}
                aria-expanded={open}
                className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="text-[14.5px] font-medium text-text-primary">{item.q}</span>
                <ChevronNotch open={open} />
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <p className="border-t border-dashed border-screen-line px-5 pt-3 pb-4 text-[13.5px] leading-relaxed text-text-secondary">
                      {item.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}
