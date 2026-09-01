const titles = [
  "Muhtemel Aşk",
  "Altı Üstü İstanbul",
  "Doğanın Kanunu",
  "Tuzlu Kahve",
  "Yeraltı",
  "Sevdam Karadeniz",
  "Taşacak Bu Deniz",
  "Teşkilat",
];

export function MarqueeStrip() {
  const items = [...titles, ...titles];

  return (
    <div className="overflow-hidden border-y border-screen-line bg-screen-glow py-2.5">
      <div className="flex w-max animate-marquee-scroll gap-8 will-change-transform motion-reduce:animate-none">
        {[...items, ...items].map((title, i) => (
          <span
            key={i}
            lang="tr"
            className="flex shrink-0 items-center gap-8 font-mono text-xs tracking-[0.12em] text-text-caption uppercase"
          >
            <span className="text-signal">★</span>
            {title}
          </span>
        ))}
      </div>
    </div>
  );
}
