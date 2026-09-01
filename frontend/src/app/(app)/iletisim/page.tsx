"use client";

import { useState, type FormEvent } from "react";
import { AuthShell } from "@/components/auth-shell";
import { GuideCard } from "@/components/guide-card";
import { FormField } from "@/components/form-field";
import { FieldError } from "@/components/field-error";
import { apiFetch } from "@/lib/api";

export default function IletisimPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    try {
      await apiFetch<{ ok: true }>("/contact", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          message: form.get("message"),
        }),
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir şeyler ters gitti.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <GuideCard className="px-9 py-10">
        {sent ? (
          <>
            <h1 className="mb-2 font-display text-3xl text-balance">Mesajın ulaştı</h1>
            <p className="text-[15px] leading-relaxed text-ink-soft">
              En kısa sürede sana döneriz.
            </p>
          </>
        ) : (
          <>
            <h1 className="mb-2 font-display text-3xl text-balance">İletişim</h1>
            <p className="mb-7 text-[15px] leading-relaxed text-ink-soft">
              Sorun, öneri ya da iş birliği teklifin için buraya yazabilirsin. En kısa sürede
              sana döneriz.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <FormField label="Adın" name="name" autoComplete="name" placeholder="Adın Soyadın" />
              <FormField
                label="E-posta"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="sen@example.com"
              />
              <label className="block">
                <span className="mb-2 block font-mono text-xs tracking-[0.08em] text-ink-soft uppercase">
                  Mesajın
                </span>
                <textarea
                  name="message"
                  required
                  minLength={10}
                  rows={4}
                  placeholder="Ne söylemek istersin?"
                  className="w-full resize-none border-b-2 border-guide-edge bg-transparent pb-2.5 text-[15px] text-ink outline-none transition-colors placeholder:text-ink-soft/50 focus:border-ink"
                />
              </label>

              {error && <FieldError>{error}</FieldError>}

              <button
                type="submit"
                disabled={loading}
                className="marquee-border w-full rounded-lg bg-ink px-6 py-3.5 font-semibold text-guide transition-transform hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:opacity-60"
              >
                {loading ? "Gönderiliyor…" : "Gönder →"}
              </button>
            </form>
          </>
        )}
      </GuideCard>
    </AuthShell>
  );
}
