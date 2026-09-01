"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { GuideCard } from "@/components/guide-card";
import { PosterThumb } from "@/components/poster-thumb";
import { RatingBadge } from "@/components/rating-badge";
import { ClapperLoader } from "@/components/clapper-loader";
import { apiFetch } from "@/lib/api";
import { withMinDelay } from "@/lib/min-delay";
import type { ShowDTO } from "@/types/show";
import { getErrorMessage } from "@/lib/get-error-message";

type InvitePreview = {
  id: string;
  name: string;
  show: ShowDTO;
  memberCount: number;
  alreadyMember: boolean;
};

export default function KatilPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = params.code.toUpperCase();

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    // Önce oturum var mı diye sessizce yokla (bu uç nokta girişsizken de 200
    // döner). Oturum yoksa korumalı davet uç noktası hiç çağrılmıyor —
    // böylece anonim ziyaretçide konsola 401 düşmüyor.
    apiFetch<{ id: string } | null>("/auth/me")
      .then((me) => {
        if (!me) {
          setNeedsAuth(true);
          return;
        }
        return withMinDelay(apiFetch<InvitePreview>(`/groups/by-invite/${code}`), 900).then(
          setPreview,
        );
      })
      .catch((err) => {
        setError(getErrorMessage(err));
      });
  }, [code]);

  async function handleJoin() {
    setJoining(true);
    try {
      await apiFetch("/groups/join", {
        method: "POST",
        body: JSON.stringify({ inviteCode: code }),
      });
      router.push(`/grup/${preview!.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
      setJoining(false);
    }
  }

  const nextUrl = `/katil/${code}`;

  return (
    <AuthShell>
      <GuideCard className="px-9 py-10">
        {needsAuth && (
          <>
            <h1 className="mb-2 font-display text-3xl text-balance">Bir davetin var.</h1>
            <p className="mb-7 text-[15px] leading-relaxed text-ink-soft">
              Bu gruba katılmak için önce giriş yapman ya da hesap oluşturman gerekiyor.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href={`/giris?next=${encodeURIComponent(nextUrl)}`}
                className="rounded-lg bg-ink px-6 py-3.5 font-semibold text-guide transition-transform hover:-translate-y-0.5"
              >
                Giriş yap →
              </Link>
              <Link
                href={`/kayit?next=${encodeURIComponent(nextUrl)}`}
                className="border-b border-guide-edge pb-0.5 pt-3.5 font-mono text-[13px] tracking-[0.04em] text-ink-soft transition-colors hover:border-ink-soft hover:text-ink"
              >
                Hesap oluştur
              </Link>
            </div>
          </>
        )}

        {error && !needsAuth && (
          <>
            <h1 className="mb-2 font-display text-3xl text-balance">Bu davet geçerli değil.</h1>
            <p className="mb-7 text-[15px] leading-relaxed text-danger">{error}</p>
          </>
        )}

        {preview && (
          <>
            <span className="mb-5 block font-mono text-xs tracking-[0.16em] text-ink-soft uppercase">
              Grup daveti
            </span>
            <div className="mb-7 flex items-center gap-4">
              <PosterThumb title={preview.show.title} posterPath={preview.show.posterPath} width={56} height={84} />
              <div>
                <h1 className="font-display text-2xl text-balance">{preview.name}</h1>
                <div className="mt-1.5 flex items-center gap-2 font-mono text-xs text-ink-soft">
                  {preview.show.title} · {preview.memberCount} üye
                  <RatingBadge voteAverage={preview.show.voteAverage} />
                </div>
              </div>
            </div>

            {preview.alreadyMember ? (
              <Link
                href={`/grup/${preview.id}`}
                className="inline-block rounded-lg bg-ink px-6 py-3.5 font-semibold text-guide transition-transform hover:-translate-y-0.5"
              >
                Zaten üyesin — gruba git →
              </Link>
            ) : (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full rounded-lg bg-ink px-6 py-3.5 font-semibold text-guide transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {joining ? "Katılıyor…" : "Gruba katıl →"}
              </button>
            )}
            {error && (
              <p role="alert" className="mt-4 text-sm text-danger">
                {error}
              </p>
            )}
          </>
        )}

        {!preview && !needsAuth && !error && (
          <ClapperLoader />
        )}
      </GuideCard>
    </AuthShell>
  );
}
