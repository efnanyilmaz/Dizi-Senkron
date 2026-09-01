"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { HeroBanner } from "@/components/hero-banner";
import { ContentRow } from "@/components/content-row";
import { PosterCard } from "@/components/poster-card";
import { GroupTicketCard } from "@/components/group-ticket-card";
import { PublicGroupCard } from "@/components/public-group-card";
import { CreateGroupForm } from "@/components/create-group-form";
import { TicketField } from "@/components/ticket-field";
import { FieldError } from "@/components/field-error";
import { UtilityPanel } from "@/components/utility-panel";
import { HeroBannerSkeleton, TicketRowSkeleton, PosterRowSkeleton } from "@/components/skeletons";
import type { ShowDTO, TmdbShow } from "@/types/show";
import { getErrorMessage } from "@/lib/get-error-message";

type MyGroup = {
  id: string;
  name: string;
  inviteCode: string;
  memberCount: number;
  myProgress: { season: number; episode: number };
  show: ShowDTO;
};

type PublicGroup = {
  id: string;
  name: string;
  memberCount: number;
  show: ShowDTO;
};

function toPreset(show: ShowDTO | TmdbShow): TmdbShow {
  if ("tmdbId" in show && "firstAirYear" in show) return show as TmdbShow;
  const s = show as ShowDTO;
  return {
    tmdbId: s.tmdbId ?? 0,
    title: s.title,
    posterPath: s.posterPath,
    backdropPath: s.backdropPath,
    voteAverage: s.voteAverage,
    firstAirYear: null,
  };
}

function StatChip({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-dashed border-screen-line px-3.5 py-1.5">
      <span className="font-display text-lg leading-none text-signal">{value}</span>
      <span className="font-mono text-[10px] tracking-[0.1em] text-text-muted uppercase">{label}</span>
    </div>
  );
}

export default function GruplarimPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<MyGroup[]>([]);
  const [trending, setTrending] = useState<TmdbShow[]>([]);
  const [favorites, setFavorites] = useState<ShowDTO[]>([]);
  const [publicGroups, setPublicGroups] = useState<PublicGroup[]>([]);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [loggedOut, setLoggedOut] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [presetShow, setPresetShow] = useState<TmdbShow | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      setLoadError(null);
      setLoggedOut(false);
    });

    // Önce oturum var mı diye sessizce yokla (bu uç nokta girişsizken de 200
    // döner). Oturum yoksa korumalı /groups/mine ve /favorites/mine hiç
    // çağrılmıyor — böylece anonim ziyaretçide konsola 401 düşmüyor.
    const meAndGroups = apiFetch<{ id: string } | null>("/auth/me")
      .then((me) => {
        if (!me) {
          setLoggedOut(true);
          setGroups([]);
          setFavorites([]);
          setPublicGroups([]);
          return;
        }

        return Promise.all([
          apiFetch<MyGroup[]>("/groups/mine").then(setGroups),
          apiFetch<ShowDTO[]>("/favorites/mine").then(setFavorites).catch(() => setFavorites([])),
          apiFetch<PublicGroup[]>("/groups/public").then(setPublicGroups).catch(() => setPublicGroups([])),
        ]);
      })
      .catch(() => {
        // Geçici bir sunucu/ağ hatası — kullanıcının gerçek verisini boş bir
        // listeyle değiştirip "çıkış yapılmış" hissi vermemek için ayrı bir
        // hata durumu göster.
        setLoadError("Gruplarına şu an ulaşılamıyor. Bağlantı sorunlu olabilir.");
      });

    const trending = apiFetch<TmdbShow[]>("/shows/trending")
      .then(setTrending)
      .catch(() => setTrending([]));

    // İkisi de bitmeden `loading` false olmasın — yoksa trend verisi (daha
    // yavaş) gelmeden "Yeni sahne" bölümü tek başına önizlenip, üstüne hero
    // banner sonradan girip sayfayı zıplatıyordu.
    Promise.all([meAndGroups, trending]).finally(() => setLoading(false));
  }, [retryTick]);

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJoinError(null);
    try {
      await apiFetch("/groups/join", {
        method: "POST",
        body: JSON.stringify({ inviteCode: joinCode.trim().toUpperCase() }),
      });
      window.location.reload();
    } catch (err) {
      setJoinError(getErrorMessage(err));
    }
  }

  async function handleJoinPublic(groupId: string) {
    setJoiningId(groupId);
    try {
      await apiFetch(`/groups/${groupId}/join`, { method: "POST" });
      router.push(`/grup/${groupId}`);
    } catch {
      setJoiningId(null);
    }
  }

  async function toggleFavorite(show: TmdbShow | ShowDTO) {
    const existing = favorites.find((f) => f.tmdbId === show.tmdbId);
    if (existing) {
      await apiFetch(`/favorites/${existing.id}`, { method: "DELETE" }).catch(() => {});
      setFavorites((prev) => prev.filter((f) => f.id !== existing.id));
    } else {
      const saved = await apiFetch<ShowDTO>("/favorites", {
        method: "POST",
        body: JSON.stringify(toPreset(show)),
      }).catch(() => null);
      if (saved) setFavorites((prev) => [saved, ...prev]);
    }
  }

  const heroGroup = groups[0];
  const heroTrending = !heroGroup ? trending[0] : undefined;
  const totalMembers = groups.reduce((sum, g) => sum + g.memberCount, 0);

  return (
    <main className="mx-auto w-full max-w-[1180px] px-8 py-16">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-[clamp(32px,4vw,44px)] text-text-primary">Kanal listen</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!loading && !loggedOut && !loadError && (
            <>
              <StatChip value={groups.length} label="Grup" />
              <StatChip value={totalMembers} label="Üye" />
            </>
          )}
        </div>
      </div>

      {loadError && (
        <p className="mb-6 flex flex-wrap items-center gap-3 rounded border border-dashed border-screen-line bg-screen-glow px-4 py-3 text-sm text-danger">
          {loadError}
          <button
            onClick={() => setRetryTick((t) => t + 1)}
            className="font-mono text-xs text-text-primary underline underline-offset-2 hover:text-signal"
          >
            Tekrar dene
          </button>
        </p>
      )}

      {loading && (
        <>
          <HeroBannerSkeleton />
          <div className="mb-10">
            <div className="mb-4 h-4 w-32 animate-pulse rounded bg-screen-glow" />
            <TicketRowSkeleton />
          </div>
          <div className="mb-10">
            <div className="mb-4 h-4 w-40 animate-pulse rounded bg-screen-glow" />
            <PosterRowSkeleton />
          </div>
        </>
      )}

      {!loading && heroGroup && (
        <HeroBanner
          id={heroGroup.id}
          eyebrow="Devam ediyor"
          title={heroGroup.name}
          subtitle={`${heroGroup.show.title} · ${heroGroup.memberCount} üye`}
          backdropPath={heroGroup.show.backdropPath}
          voteAverage={heroGroup.show.voteAverage}
          actionLabel="Gruba git →"
          onAction={() => router.push(`/grup/${heroGroup.id}`)}
        />
      )}

      {!loading && heroTrending && (
        <HeroBanner
          id={`trend-${heroTrending.tmdbId}`}
          eyebrow="Bu hafta trend"
          title={heroTrending.title}
          subtitle={`${heroTrending.firstAirYear ?? ""}`}
          backdropPath={heroTrending.backdropPath}
          voteAverage={heroTrending.voteAverage}
          actionLabel="Bunun için grup oluştur →"
          onAction={() => setPresetShow(heroTrending)}
        />
      )}

      {!loading && groups.length > 0 && (
        <section className="mb-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="mb-1 font-mono text-xs tracking-[0.16em] text-text-muted uppercase">
                Gruplarım
              </div>
              <h2 className="font-display text-xl text-text-primary">Biletlerin elinde</h2>
            </div>
          </div>
          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
            {groups.map((group) => (
              <GroupTicketCard
                key={group.id}
                name={group.name}
                showTitle={group.show.title}
                posterPath={group.show.posterPath}
                voteAverage={group.show.voteAverage}
                season={group.myProgress.season}
                episode={group.myProgress.episode}
                memberCount={group.memberCount}
                inviteCode={group.inviteCode}
                totalSeasons={group.show.totalSeasons}
                totalEpisodes={group.show.totalEpisodes}
                onClick={() => router.push(`/grup/${group.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {!loading && publicGroups.length > 0 && (
        <section className="mb-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="mb-1 font-mono text-xs tracking-[0.16em] text-text-muted uppercase">
                Keşfet
              </div>
              <h2 className="font-display text-xl text-text-primary">Herkese açık gruplar</h2>
            </div>
          </div>
          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
            {publicGroups.map((group) => (
              <PublicGroupCard
                key={group.id}
                name={group.name}
                showTitle={group.show.title}
                posterPath={group.show.posterPath}
                voteAverage={group.show.voteAverage}
                memberCount={group.memberCount}
                joining={joiningId === group.id}
                onJoin={() => handleJoinPublic(group.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* loadError varken oturum durumu bilinmiyor demektir (bkz. yukarıdaki
          catch) — kullanıcı giriş yapmış gibi davranıp grup oluşturma/katılma
          formlarını göstermek yanıltıcı olur, "Tekrar dene" ile devam etsin. */}
      {!loading && !loadError && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mb-12"
        >
          <div className="mb-4 font-mono text-xs tracking-[0.16em] text-text-muted uppercase">
            Yeni sahne
          </div>
          {loggedOut ? (
            <UtilityPanel label="Grup kurmak için giriş yap">
              <p className="mb-4 text-sm text-text-muted">
                Yeni bir izleme grubu oluşturmak veya davet koduyla bir gruba katılmak için önce
                giriş yapman gerekiyor.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/giris"
                  className="rounded-[3px] border border-dashed border-screen-line px-4 py-2.5 font-mono text-[13px] tracking-[0.04em] text-text-primary transition-colors hover:border-signal hover:bg-signal-soft"
                >
                  Giriş yap
                </Link>
                <Link
                  href="/kayit"
                  className="rounded-[3px] border border-dashed border-screen-line px-4 py-2.5 font-mono text-[13px] tracking-[0.04em] text-text-muted transition-colors hover:border-signal hover:text-text-primary"
                >
                  Hesap oluştur
                </Link>
              </div>
            </UtilityPanel>
          ) : (
            <div className="grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">
              <CreateGroupForm presetShow={presetShow} />

              <UtilityPanel label="Davet koduyla katıl">
                <form onSubmit={handleJoin} className="flex flex-wrap items-end gap-4">
                  <TicketField
                    label="Kod"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="FRK7QLM"
                    className="flex-1 font-mono"
                  />
                  <button
                    type="submit"
                    className="rounded-[3px] border border-dashed border-screen-line px-4 py-2.5 font-mono text-[13px] tracking-[0.04em] text-text-primary transition-colors hover:border-signal hover:bg-signal-soft"
                  >
                    Katıl
                  </button>
                  {joinError && <FieldError>{joinError}</FieldError>}
                </form>
              </UtilityPanel>
            </div>
          )}
        </motion.div>
      )}

      {!loading && trending.length > 0 && (
        <ContentRow label="Keşfet" title="Bu hafta trend olanlar">
          {trending.map((show) => (
            <PosterCard
              key={show.tmdbId}
              title={show.title}
              posterPath={show.posterPath}
              year={show.firstAirYear}
              voteAverage={show.voteAverage}
              isFavorite={favorites.some((f) => f.tmdbId === show.tmdbId)}
              onToggleFavorite={() => toggleFavorite(show)}
              onClick={() => router.push(`/dizi/${show.tmdbId}`)}
            />
          ))}
        </ContentRow>
      )}

      {!loading && favorites.length > 0 && (
        <ContentRow
          label="Kişisel liste"
          title="Favorilerim"
          action={
            <Link href="/favoriler" className="font-mono text-xs text-text-muted hover:text-text-primary">
              Tümünü gör →
            </Link>
          }
        >
          {favorites.map((show) => (
            <PosterCard
              key={show.id}
              title={show.title}
              posterPath={show.posterPath}
              voteAverage={show.voteAverage}
              isFavorite
              onToggleFavorite={() => toggleFavorite(show)}
              onClick={() => show.tmdbId && router.push(`/dizi/${show.tmdbId}`)}
            />
          ))}
        </ContentRow>
      )}
    </main>
  );
}
