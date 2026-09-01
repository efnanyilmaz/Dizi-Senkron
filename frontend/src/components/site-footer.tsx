import Image from "next/image";

const columns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Ürün",
    links: [
      { label: "Keşfet", href: "/kesfet" },
      { label: "Gruplarım", href: "/gruplarim" },
      { label: "Favorilerim", href: "/favoriler" },
    ],
  },
  {
    title: "Yasal",
    links: [
      { label: "Gizlilik ve KVKK", href: "/gizlilik" },
      { label: "Kullanım koşulları", href: "/kullanim-kosullari" },
    ],
  },
  {
    title: "İletişim",
    links: [
      { label: "İletişim Formu", href: "/iletisim" },
      { label: "dizisenkron@gmail.com", href: "mailto:dizisenkron@gmail.com" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-screen-line">
      <div className="sprocket-strip" />

      <div className="mx-auto w-full max-w-[1180px] px-8 py-12">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-8 max-[700px]:grid-cols-2 max-[420px]:grid-cols-1">
          <div>
            <div className="mb-3 flex items-center gap-2.5">
              <Image
                src="/logo-icon.png"
                alt="Dizi Senkron"
                width={22}
                height={22}
                className="h-[22px] w-[22px] shrink-0 rounded-[5px]"
              />
              <span className="font-mono text-xs tracking-[0.14em] text-text-primary uppercase">
                Dizi Senkron
              </span>
            </div>
            <p className="max-w-[26ch] text-[13px] leading-relaxed text-text-muted">
              Arkadaş gruplarıyla dizi takibi, spoiler&apos;sız sohbet.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <div className="mb-3 font-mono text-[11px] tracking-[0.14em] text-text-muted uppercase">
                {col.title}
              </div>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[13px] text-text-muted transition-colors hover:text-text-primary"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-dashed border-screen-line pt-5 font-mono text-[11px] tracking-[0.06em] text-text-muted">
          © 2026 Dizi Senkron. Tüm hakları saklıdır.
        </div>
      </div>
    </footer>
  );
}
