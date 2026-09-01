"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-8 py-16 text-center">
      <div className="w-full max-w-[420px] overflow-hidden rounded-lg border border-screen-line bg-screen-glow">
        <div className="sprocket-strip" />
        <div className="px-8 py-12">
          <div className="mb-3 font-mono text-xs tracking-[0.24em] text-danger uppercase">
            Prodüksiyon durdu
          </div>
          <h1 className="mb-3 font-display text-3xl text-text-primary">Bir şeyler ters gitti.</h1>
          <p className="mb-8 text-[15px] leading-relaxed text-text-secondary">
            Sahne yeniden çekilmeli — sayfayı tekrar yüklemeyi dene.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={reset}
              className="marquee-border inline-flex items-center gap-2 rounded-lg bg-guide px-6 py-3 font-semibold text-ink transition-transform hover:-translate-y-0.5"
            >
              Tekrar dene
            </button>
            <Link
              href="/"
              className="font-mono text-xs tracking-[0.06em] text-text-muted hover:text-text-primary"
            >
              Ana sayfaya dön →
            </Link>
          </div>
        </div>
        <div className="sprocket-strip" />
      </div>
    </main>
  );
}
