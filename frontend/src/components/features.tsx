"use client";

import { useSyncExternalStore } from "react";
import { motion } from "framer-motion";

// Kartların eğikliği (-5/0/5 derece) ve dikey kayması (-8/14px), masaüstündeki
// dağınık deste görünümü için — kartlar mobilde alt alta dizilince hem eğik
// durup dağınık görünüyorlardı hem de kayma eşit olmayan boşluklar
// yaratıyordu (ortadaki kart yukarı, diğerleri aşağı kaydığından). Bu yüzden
// mobilde (880px altı) ikisi de sıfırlanıyor. Framer Motion `y` (ve/veya
// `rotate`) kontrol ettiği an elemanın TÜM transform'unu kendi yazdığından,
// bu değerler CSS class'ı değil — doğrudan Framer Motion'ın kendisine
// (whileInView/whileHover) viewport'a göre verilmeli; aksi halde bir CSS
// class'ıyla eklenen rotate, Framer Motion'ın yazdığı transform tarafından
// sessizce eziliyor.
//
// window.matchMedia gibi dış (React dışı) bir kaynağa abone olmak için
// useEffect+useState yerine useSyncExternalStore kullanılıyor — sunucu
// tarafında güvenli bir varsayılan (masaüstü) döner, tarayıcıda gerçek
// değere anında geçer, effect içinde senkron setState gerektirmez.
function subscribe(callback: () => void) {
  const query = window.matchMedia("(min-width: 881px)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia("(min-width: 881px)").matches;
}

function getServerSnapshot() {
  return true;
}

function useDesktopStagger() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const features = [
  {
    title: "Yerini işaretle",
    body: 'Bitirdiğin bölümü işaretle. Dizi Senkron hatırlar, bir daha "nerede kalmıştık?" diye sormazsın.',
    z: 10,
    rotate: -5,
    rest: 14,
  },
  {
    title: "Grubu tek bakışta gör",
    body: "Kim yakalamış, kim geride, kaç bölüm geride — tek ekranda net biçimde görürsün.",
    z: 30,
    rotate: 0,
    rest: -8,
  },
  {
    title: "Spoiler vermeden sohbet et",
    body: "Grup sohbeti dizinin içinde yaşar. 7. bölüm hakkında istediğini söyle, henüz 4. bölümde olanlar göremez.",
    z: 20,
    rotate: 5,
    rest: 14,
  },
];

function Notch({ side }: { side: "left" | "right" }) {
  return (
    <span
      className={`absolute -top-1.5 h-3 w-3 rounded-full bg-screen ${
        side === "left" ? "-left-1.5" : "-right-1.5"
      }`}
    />
  );
}

export function Features() {
  const isDesktop = useDesktopStagger();

  return (
    <section id="nasil-calisir" className="mx-auto w-full max-w-[1180px] px-8 pb-28">
      <div className="mb-16 flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="mb-3.5 font-mono text-xs tracking-[0.16em] text-text-muted uppercase">
            Nasıl çalışır
          </div>
          <h2 className="font-display text-[clamp(26px,3vw,34px)] text-balance text-text-primary">
            Üç adım. Spoiler kaygısı yok.
          </h2>
        </div>
        <p className="max-w-[38ch] text-[15px] leading-relaxed text-text-secondary">
          Bir diziye birlikte başlayıp dört farklı hızda bitiren arkadaş grupları için.
        </p>
      </div>

      <div className="flex flex-wrap items-start justify-center gap-x-0 gap-y-14 pt-6 max-[880px]:flex-col max-[880px]:items-center max-[880px]:gap-y-10">
        {features.map((feature, i) => {
          const rest = isDesktop ? feature.rest : 0;
          const rotate = isDesktop ? feature.rotate : 0;
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ rotate }}
              whileInView={{ opacity: 1, y: rest }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.12, ease: "easeOut" }}
              whileHover={{
                y: rest - 16,
                rotate: 0,
                zIndex: 40,
                transition: { duration: 0.25, ease: "easeOut" },
              }}
              style={{ zIndex: feature.z }}
              className="relative w-[260px] shrink-0 max-[880px]:ml-0 md:[&:not(:first-child)]:-ml-5"
            >
              <div className="rounded-lg bg-guide text-ink shadow-[0_24px_44px_-20px_rgba(0,0,0,0.6)]">
                <div className="flex min-h-[168px] flex-col p-6">
                  <h3 className="mb-2.5 font-display text-xl leading-tight">{feature.title}</h3>
                  <p className="text-[13.5px] leading-relaxed text-ink-soft">{feature.body}</p>
                </div>

                <div className="relative border-t border-dashed border-guide-edge px-6 py-3">
                  <Notch side="left" />
                  <Notch side="right" />
                  <span className="font-mono text-[10px] tracking-[0.14em] text-ink-soft/70 uppercase">
                    Dizi Senkron · Grup Bileti
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
