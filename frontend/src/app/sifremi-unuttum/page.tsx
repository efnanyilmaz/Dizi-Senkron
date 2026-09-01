"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { GuideCard } from "@/components/guide-card";
import { FormField } from "@/components/form-field";
import { FieldError } from "@/components/field-error";
import { apiFetch } from "@/lib/api";
import { getErrorMessage } from "@/lib/get-error-message";

type ForgotPasswordResponse = { message: string; resetLink?: string };

export default function SifremiUnuttumPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ForgotPasswordResponse | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    try {
      const data = await apiFetch<ForgotPasswordResponse>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: form.get("email") }),
      });
      setResult(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <GuideCard className="px-9 py-10">
        <h1 className="mb-2 font-display text-3xl text-balance">Şifreni mi unuttun?</h1>
        <p className="mb-7 text-[15px] leading-relaxed text-ink-soft">
          E-posta adresini gir, sana bir sıfırlama bağlantısı hazırlayalım.
        </p>

        {result ? (
          <div className="space-y-4">
            <p className="text-[15px] leading-relaxed text-ink">{result.message}</p>
            {result.resetLink && (
              <div className="rounded-lg border border-dashed border-guide-edge px-4 py-3.5">
                <p className="mb-2 font-mono text-xs tracking-[0.06em] text-ink-soft uppercase">
                  Test modu — e-posta servisi bağlı değil
                </p>
                <Link
                  href={result.resetLink}
                  className="text-[13px] font-medium text-ink underline underline-offset-2"
                >
                  Sıfırlama bağlantına git →
                </Link>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField
              label="E-posta"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="sen@example.com"
            />

            {error && <FieldError>{error}</FieldError>}

            <button
              type="submit"
              disabled={loading}
              className="marquee-border w-full rounded-lg bg-ink px-6 py-3.5 font-semibold text-guide transition-transform hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:opacity-60"
            >
              {loading ? "Gönderiliyor…" : "Sıfırlama bağlantısı gönder →"}
            </button>
          </form>
        )}
      </GuideCard>
    </AuthShell>
  );
}
