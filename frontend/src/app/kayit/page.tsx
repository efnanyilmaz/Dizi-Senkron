"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { GuideCard } from "@/components/guide-card";
import { FormField } from "@/components/form-field";
import { FieldError } from "@/components/field-error";
import { apiFetch } from "@/lib/api";

function KayitForm() {
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
      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          displayName: form.get("displayName"),
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      router.push(next || "/gruplarim");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir şeyler ters gitti.");
      setLoading(false);
    }
  }

  return (
    <GuideCard className="px-9 py-10">
      <h1 className="mb-2 font-display text-3xl text-balance">Hesap oluştur</h1>
      <p className="mb-7 text-[15px] leading-relaxed text-ink-soft">
        Hesabını oluştur, ilk grubunu kur, arkadaşların katılsın.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormField label="Görünen ad" name="displayName" autoComplete="name" placeholder="Adın Soyadın" />
        <FormField
          label="E-posta"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="sen@example.com"
        />
        <FormField
          label="Şifre"
          name="password"
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
          {loading ? "Hesap oluşturuluyor…" : "Hesap oluştur →"}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-soft">
        Zaten hesabın var mı?{" "}
        <Link
          href={next ? `/giris?next=${encodeURIComponent(next)}` : "/giris"}
          className="font-medium text-ink underline underline-offset-2"
        >
          Giriş yap
        </Link>
      </p>
    </GuideCard>
  );
}

export default function KayitPage() {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <KayitForm />
      </Suspense>
    </AuthShell>
  );
}
