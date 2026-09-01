"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { GuideCard } from "@/components/guide-card";
import { apiFetch } from "@/lib/api";

function EpostaDegistirOnaylaContent() {
  const token = useSearchParams().get("token");
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  // Token tek kullanımlık — React Strict Mode aynı efekti iki kez
  // çalıştırabildiği için, istek zaten bu token'la gönderildiyse ikinci
  // çağrının sonucu ekrana yansıtılmaz.
  const requestedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token) {
      queueMicrotask(() => {
        setStatus("error");
        setError("Bağlantı geçersiz.");
      });
      return;
    }
    if (requestedTokenRef.current === token) return;
    requestedTokenRef.current = token;

    apiFetch("/auth/confirm-email-change", { method: "POST", body: JSON.stringify({ token }) })
      .then(() => setStatus("done"))
      .catch((err) => {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Bir şeyler ters gitti.");
      });
  }, [token]);

  if (status === "loading") {
    return (
      <GuideCard className="px-9 py-10">
        <h1 className="mb-2 font-display text-3xl text-balance">Onaylanıyor…</h1>
        <p className="text-[15px] leading-relaxed text-ink-soft">Bir saniye sürer.</p>
      </GuideCard>
    );
  }

  if (status === "error") {
    return (
      <GuideCard className="px-9 py-10">
        <h1 className="mb-2 font-display text-3xl text-balance">Onaylanamadı.</h1>
        <p className="mb-7 text-[15px] leading-relaxed text-ink-soft">{error}</p>
        <Link href="/profil" className="font-medium text-ink underline underline-offset-2">
          Profiline dön →
        </Link>
      </GuideCard>
    );
  }

  return (
    <GuideCard className="px-9 py-10">
      <h1 className="mb-2 font-display text-3xl text-balance">E-postan değişti.</h1>
      <p className="mb-7 text-[15px] leading-relaxed text-ink-soft">
        Bundan sonra girişte yeni adresini kullan.
      </p>
      <Link href="/profil" className="font-medium text-ink underline underline-offset-2">
        Profiline dön →
      </Link>
    </GuideCard>
  );
}

export default function EpostaDegistirOnaylaPage() {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <EpostaDegistirOnaylaContent />
      </Suspense>
    </AuthShell>
  );
}
