"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { GuideCard } from "@/components/guide-card";
import { FormField } from "@/components/form-field";
import { FieldError } from "@/components/field-error";
import { apiFetch } from "@/lib/api";

function SifreSifirlaForm() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword: form.get("newPassword") }),
      });
      setDone(true);
      setTimeout(() => router.push("/giris"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir şeyler ters gitti.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <GuideCard className="px-9 py-10">
        <h1 className="mb-2 font-display text-3xl text-balance">Bağlantı geçersiz.</h1>
        <p className="mb-7 text-[15px] leading-relaxed text-ink-soft">
          Bu sayfaya doğrudan gelinemez — önce şifre sıfırlama isteği oluşturman gerekiyor.
        </p>
        <Link href="/sifremi-unuttum" className="font-medium text-ink underline underline-offset-2">
          Şifremi unuttum →
        </Link>
      </GuideCard>
    );
  }

  if (done) {
    return (
      <GuideCard className="px-9 py-10">
        <h1 className="mb-2 font-display text-3xl text-balance">Şifren değişti.</h1>
        <p className="text-[15px] leading-relaxed text-ink-soft">Girişe yönlendiriliyorsun…</p>
      </GuideCard>
    );
  }

  return (
    <GuideCard className="px-9 py-10">
      <h1 className="mb-2 font-display text-3xl text-balance">Yeni şifre belirle.</h1>
      <p className="mb-7 text-[15px] leading-relaxed text-ink-soft">
        Hesabın için yeni bir şifre gir.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormField
          label="Yeni şifre"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          placeholder="En az 8 karakter"
          minLength={8}
        />

        {error && <FieldError>{error}</FieldError>}

        <button
          type="submit"
          disabled={loading}
          className="marquee-border w-full rounded-lg bg-ink px-6 py-3.5 font-semibold text-guide transition-transform hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:opacity-60"
        >
          {loading ? "Kaydediliyor…" : "Şifreyi değiştir →"}
        </button>
      </form>
    </GuideCard>
  );
}

export default function SifreSifirlaPage() {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <SifreSifirlaForm />
      </Suspense>
    </AuthShell>
  );
}
