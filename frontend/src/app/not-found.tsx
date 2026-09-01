import Link from "next/link";

export const metadata = { title: "Sahne bulunamadı" };

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-8 py-16 text-center">
      <div className="w-full max-w-[420px] overflow-hidden rounded-lg border border-screen-line bg-screen-glow">
        <div className="sprocket-strip sprocket-strip-live" />
        <div className="px-8 py-12">
          <div className="mb-3 font-mono text-xs tracking-[0.24em] text-signal uppercase">
            404
          </div>
          <h1 className="mb-3 font-display text-4xl text-text-primary">Bu sahne bulunamadı.</h1>
          <p className="mb-8 text-[15px] leading-relaxed text-text-secondary">
            Aradığın sayfa kesilmiş ya da hiç çekilmemiş olabilir.
          </p>
          <Link
            href="/"
            className="marquee-border inline-flex items-center gap-2 rounded-lg bg-guide px-6 py-3 font-semibold text-ink transition-transform hover:-translate-y-0.5"
          >
            Ana sayfaya dön →
          </Link>
        </div>
        <div className="sprocket-strip sprocket-strip-live" />
      </div>
    </main>
  );
}
