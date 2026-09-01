"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { GuideCard } from "@/components/guide-card";
import { apiFetch } from "@/lib/api";
import { getErrorMessage } from "@/lib/get-error-message";

function EpostaDogrulaContent() {
  const token = useSearchParams().get("token");
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  // Token tek kullanımlık — React Strict Mode aynı efekti iki kez
  // çalıştırabildiği için, istek zaten bu token'la gönderildiyse ikinci
  // çağrının (birincisi başarılı olsa bile artık geçersiz token'la
  // gelecek) sonucu ekrana yansıtılmaz.
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

    apiFetch("/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) })
      .then(() => setStatus("done"))
      .catch((err) => {
        setStatus("error");
        setError(getErrorMessage(err));
      });
  }, [token]);

  if (status === "loading") {
    return (
      <GuideCard className="px-9 py-10">
        <h1 className="mb-2 font-display text-3xl text-balance">Doğrulanıyor…</h1>
        <p className="text-[15px] leading-relaxed text-ink-soft">Bir saniye sürer.</p>
      </GuideCard>
    );
  }

  if (status === "error") {
    return (
      <GuideCard className="px-9 py-10">
        <h1 className="mb-2 font-display text-3xl text-balance">Doğrulanamadı.</h1>
        <p className="mb-7 text-[15px] leading-relaxed text-ink-soft">{error}</p>
        <Link href="/profil" className="font-medium text-ink underline underline-offset-2">
          Profiline dön →
        </Link>
      </GuideCard>
    );
  }

  return (
    <GuideCard className="px-9 py-10">
      <h1 className="mb-2 font-display text-3xl text-balance">E-postan doğrulandı.</h1>
      <p className="mb-7 text-[15px] leading-relaxed text-ink-soft">
        Hesabın artık tamamen aktif.
      </p>
      <Link href="/gruplarim" className="font-medium text-ink underline underline-offset-2">
        Gruplarıma git →
      </Link>
    </GuideCard>
  );
}

export default function EpostaDogrulaPage() {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <EpostaDogrulaContent />
      </Suspense>
    </AuthShell>
  );
}
