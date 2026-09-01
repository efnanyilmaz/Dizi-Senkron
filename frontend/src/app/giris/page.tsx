"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { GuideCard } from "@/components/guide-card";
import { FormField } from "@/components/form-field";
import { FieldError } from "@/components/field-error";
import { apiFetch } from "@/lib/api";
import { getErrorMessage } from "@/lib/get-error-message";

function GirisForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    try {
      await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      router.push(next || "/gruplarim");
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <GuideCard className="px-9 py-10">
      <h1 className="mb-2 font-display text-3xl text-balance">Giriş yap</h1>
      <p className="mb-7 text-[15px] leading-relaxed text-ink-soft">
        Gruplarına dön, kaldığın yerden devam et.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormField
          label="E-posta"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="sen@example.com"
        />
        <div>
          <FormField
            label="Şifre"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Şifren"
          />
          <Link
            href="/sifremi-unuttum"
            className="mt-2 inline-block font-mono text-xs text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            Şifremi unuttum
          </Link>
        </div>

        {error && <FieldError>{error}</FieldError>}

        <button
          type="submit"
          disabled={loading}
          className="marquee-border w-full rounded-lg bg-ink px-6 py-3.5 font-semibold text-guide transition-transform hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:opacity-60"
        >
          {loading ? "Giriş yapılıyor…" : "Giriş yap →"}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-soft">
        Hesabın yok mu?{" "}
        <Link
          href={next ? `/kayit?next=${encodeURIComponent(next)}` : "/kayit"}
          className="font-medium text-ink underline underline-offset-2"
        >
          Kayıt ol
        </Link>
      </p>
    </GuideCard>
  );
}

export default function GirisPage() {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <GirisForm />
      </Suspense>
    </AuthShell>
  );
}
