"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { SyncTicker } from "@/components/sync-ticker";
import { ChatPanel, type ChatMessage } from "@/components/chat-panel";
import { RatingBadge } from "@/components/rating-badge";
import { PosterThumb } from "@/components/poster-thumb";
import { GroupManagement } from "@/components/group-management";
import { GroupPoll } from "@/components/group-poll";
import { InviteQr } from "@/components/invite-qr";
import { NextEpisodeBanner } from "@/components/next-episode-banner";
import { ClapperLoader } from "@/components/clapper-loader";
import { withMinDelay } from "@/lib/min-delay";
import { WatchTogether, type WatchPosition } from "@/components/watch-together";
import { apiFetch } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { toMemberProgress } from "@/lib/member-progress";
import { backdropUrl } from "@/lib/tmdb-image";
import type { GroupDetail, MessageDTO } from "@/types/group";
import type { NextEpisodeInfo } from "@/types/show";
import { getErrorMessage } from "@/lib/get-error-message";

type Me = { id: string; displayName: string };

function toChatMessage(message: MessageDTO, myUserId: string): ChatMessage {
  return {
    id: message.id,
    authorId: message.user.id,
    authorName:
      message.user.id === myUserId ? `${message.user.displayName} (sen)` : message.user.displayName,
    authorSeason: message.authorSeason,
    authorEpisode: message.authorEpisode,
    content: message.content,
    time: new Date(message.createdAt).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    editedAt: message.editedAt,
    deletedAt: message.deletedAt,
    reactions: message.reactions.map((r) => ({ emoji: r.emoji, userId: r.userId })),
  };
}

export default function GrupDetayPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const groupId = params.id;

  const [me, setMe] = useState<Me | null>(null);
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [nextEpisode, setNextEpisode] = useState<NextEpisodeInfo | null>(null);
  const [watchPositions, setWatchPositions] = useState<Map<string, WatchPosition>>(new Map());
  const lastTypingEmitRef = useRef(0);

  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  // Sunucudan bilinen (ya da en son gönderilen) sezon/bölüm — otomatik
  // kaydetme, mevcut değer buradan gerçekten farklıysa tetiklenir. Tek
  // seferlik bir "atla" bayrağı yerine bunu kullanmak, React Strict Mode'un
  // efekti iki kez çalıştırmasında bile yanlış bir kayıt tetiklenmesini
  // önler (başlangıç değerleriyle sunucudan gelen gerçek değer arasındaki
  // yarış nedeniyle 1/1'e geri sıfırlanma riskini ortadan kaldırır).
  const lastSyncedRef = useRef({ season: 1, episode: 1 });

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      setLoading(true);
      setLoadError(null);
      setNeedsAuth(false);
    });

    // Önce oturum var mı diye sessizce yokla (bu uç nokta girişsizken de 200
    // döner). Oturum yoksa korumalı grup/mesaj uç noktaları hiç çağrılmıyor —
    // böylece anonim ziyaretçide konsola 401 düşmüyor.
    apiFetch<Me | null>("/auth/me")
      .then((meData) => {
        if (cancelled) return;
        if (!meData) {
          setNeedsAuth(true);
          return;
        }

        return withMinDelay(
          Promise.all([
            apiFetch<GroupDetail>(`/groups/${groupId}`),
            apiFetch<MessageDTO[]>(`/groups/${groupId}/messages`),
          ]),
          900,
        ).then(([groupData, messageData]) => {
          if (cancelled) return;
          setMe(meData);
          setGroup(groupData);
          setMessages(messageData.map((m) => toChatMessage(m, meData.id)));
          const mine = groupData.members.find((m) => m.user.id === meData.id);
          if (mine) {
            lastSyncedRef.current = { season: mine.currentSeason, episode: mine.currentEpisode };
            setSeason(mine.currentSeason);
            setEpisode(mine.currentEpisode);
          }
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          getErrorMessage(err, "Grup yüklenemedi, bağlantı sorunlu olabilir."),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [groupId, retryTick]);

  useEffect(() => {
    if (!me || loadError) return;

    const socket = getSocket();
    socket.connect();
    socket.emit("join_group", groupId);

    function handleMessage(message: MessageDTO) {
      setMessages((prev) => [...prev, toChatMessage(message, me!.id)]);
    }

    function handleProgress({
      userId,
      season,
      episode,
    }: {
      userId: string;
      season: number;
      episode: number;
    }) {
      setGroup((prev) =>
        prev
          ? {
              ...prev,
              members: prev.members.map((m) =>
                m.user.id === userId ? { ...m, currentSeason: season, currentEpisode: episode } : m,
              ),
            }
          : prev,
      );
    }

    function handleSocketError({ message }: { message: string }) {
      setNotice(message);
    }

    function handleVideoChanged({
      videoId,
      dailymotionId,
      externalUrl,
      embeddable,
    }: {
      videoId: string | null;
      dailymotionId: string | null;
      externalUrl: string | null;
      embeddable: boolean;
    }) {
      setGroup((prev) =>
        prev
          ? {
              ...prev,
              nowPlayingVideoId: videoId,
              nowPlayingDailymotionId: dailymotionId,
              nowPlayingExternalUrl: externalUrl,
              nowPlayingEmbeddable: embeddable,
            }
          : prev,
      );
      // Yeni video için eski "neredeyim" paylaşımları anlamsız kalır.
      setWatchPositions(new Map());
    }

    function handleWatchPosition({
      userId,
      displayName,
      positionLabel,
    }: {
      userId: string;
      displayName: string;
      positionLabel: string;
    }) {
      setWatchPositions((prev) => {
        const next = new Map(prev);
        next.set(userId, { userId, displayName, positionLabel });
        return next;
      });
    }

    function handleReactions({
      messageId,
      reactions,
    }: {
      messageId: string;
      reactions: { emoji: string; userId: string }[];
    }) {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)));
    }

    function handlePresence({ userIds }: { userIds: string[] }) {
      setOnlineUserIds(new Set(userIds));
    }

    function handleMessageEdited({
      id,
      content,
      editedAt,
    }: {
      id: string;
      content: string;
      editedAt: string;
    }) {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content, editedAt } : m)));
    }

    function handleMessageDeleted({ id, deletedAt }: { id: string; deletedAt: string }) {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, content: "", deletedAt } : m)),
      );
    }

    function handleMessageReported() {
      setNotice("Mesajı bildirdin, teşekkürler.");
    }

    function handleTyping({
      userId,
      displayName,
      isTyping,
    }: {
      userId: string;
      displayName: string;
      isTyping: boolean;
    }) {
      if (userId === me!.id) return;
      setTypingUsers((prev) => {
        const next = new Map(prev);
        if (isTyping) next.set(userId, displayName);
        else next.delete(userId);
        return next;
      });
    }

    socket.on("message_received", handleMessage);
    socket.on("progress_updated", handleProgress);
    socket.on("video_changed", handleVideoChanged);
    socket.on("watch_position_updated", handleWatchPosition);
    socket.on("reactions_updated", handleReactions);
    socket.on("presence_updated", handlePresence);
    socket.on("user_typing", handleTyping);
    socket.on("message_edited", handleMessageEdited);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("message_reported", handleMessageReported);
    socket.on("error", handleSocketError);
    socket.on("connect_error", () => setNotice("Sunucuya bağlanılamadı."));

    return () => {
      socket.off("message_received", handleMessage);
      socket.off("progress_updated", handleProgress);
      socket.off("video_changed", handleVideoChanged);
      socket.off("watch_position_updated", handleWatchPosition);
      socket.off("reactions_updated", handleReactions);
      socket.off("presence_updated", handlePresence);
      socket.off("user_typing", handleTyping);
      socket.off("message_edited", handleMessageEdited);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("message_reported", handleMessageReported);
      socket.off("error", handleSocketError);
      socket.disconnect();
      setOnlineUserIds(new Set());
      setTypingUsers(new Map());
      setWatchPositions(new Map());
    };
  }, [me, loadError, groupId]);

  // Yayın takvimi — grubun ana verisine bağlı değil, ayrı ve sessizce
  // yüklenir; TMDB'den alınamazsa banner zaten hiç görünmez.
  useEffect(() => {
    if (!group?.show.tmdbId) return;
    let cancelled = false;
    apiFetch<{ nextEpisode: NextEpisodeInfo | null }>(`/shows/tmdb/${group.show.tmdbId}`)
      .then((detail) => {
        if (!cancelled) setNextEpisode(detail.nextEpisode);
      })
      .catch(() => {
        if (!cancelled) setNextEpisode(null);
      });
    return () => {
      cancelled = true;
    };
  }, [group?.show.tmdbId]);

  const members = useMemo(
    () => (group ? toMemberProgress(group.members, me?.id, onlineUserIds) : []),
    [group, me, onlineUserIds],
  );

  // Sezon/bölüm değiştikçe otomatik kaydeder — sadece değer sunucudan bilinen
  // (en son senkronlanan) değerden gerçekten farklıysa. Bu, ilk yüklemede
  // henüz sunucu verisi gelmeden tetiklenebilecek yanlış bir kaydı önler.
  useEffect(() => {
    if (lastSyncedRef.current.season === season && lastSyncedRef.current.episode === episode) {
      return;
    }
    const timeout = setTimeout(() => {
      getSocket().emit("update_progress", { groupId, season, episode });
      lastSyncedRef.current = { season, episode };
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }, 600);
    return () => clearTimeout(timeout);
  }, [season, episode, groupId]);

  function handleSend(content: string) {
    getSocket().emit("send_message", { groupId, content });
  }

  function handleTypingInput() {
    // Her tuş vuruşunda emitlemek zararsız — sunucu zaten "yazıyor" durumu
    // zaten açıksa yeniden yayın yapmıyor, sadece zaman aşımını yeniliyor.
    // Yine de istemci tarafında da hafif bir kısıtlama (1sn) uygulanır.
    const now = Date.now();
    if (now - lastTypingEmitRef.current < 1000) return;
    lastTypingEmitRef.current = now;
    getSocket().emit("typing_start", { groupId });
  }

  function handleShareInvite() {
    if (!group) return;
    const url = `${window.location.origin}/katil/${group.inviteCode}`;
    const text = `${group.name} grubuna katıl — birlikte ${group.show.title} izliyoruz.`;
    if (navigator.share) {
      navigator.share({ title: group.name, text, url }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank", "noopener,noreferrer");
    }
  }

  function handleReact(messageId: string, emoji: string) {
    getSocket().emit("toggle_reaction", { groupId, messageId, emoji });
  }

  function handleSharePosition(positionLabel: string) {
    getSocket().emit("share_watch_position", { groupId, positionLabel });
  }

  function handleEditMessage(messageId: string, content: string) {
    getSocket().emit("edit_message", { groupId, messageId, content });
  }

  function handleDeleteMessage(messageId: string) {
    getSocket().emit("delete_message", { groupId, messageId });
  }

  function handleReportMessage(messageId: string, reason: string) {
    getSocket().emit("report_message", { groupId, messageId, reason });
  }

  async function handleRename() {
    const trimmed = nameDraft.trim();
    if (!trimmed || !group || trimmed === group.name) {
      setEditingName(false);
      return;
    }
    setRenaming(true);
    try {
      const updated = await apiFetch<{ name: string }>(`/groups/${groupId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: trimmed }),
      });
      setGroup((prev) => (prev ? { ...prev, name: updated.name } : prev));
      setEditingName(false);
    } catch (err) {
      setNotice(getErrorMessage(err, "Grup adı değiştirilemedi."));
    } finally {
      setRenaming(false);
    }
  }

  function handleCopyInvite() {
    if (!group) return;
    navigator.clipboard
      .writeText(`${window.location.origin}/katil/${group.inviteCode}`)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => setNotice("Bağlantı kopyalanamadı, elle kopyalayabilirsin."));
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-[1180px] px-8 py-16">
        <ClapperLoader />
      </main>
    );
  }

  if (needsAuth) {
    return (
      <main className="mx-auto w-full max-w-[1180px] px-8 py-16">
        <p className="mb-4 text-danger">Bu sayfayı görmek için giriş yapman gerekiyor.</p>
        <Link href="/giris" className="font-mono text-xs text-text-muted hover:text-text-primary">
          Giriş yap →
        </Link>
      </main>
    );
  }

  if (loadError || !group) {
    return (
      <main className="mx-auto w-full max-w-[1180px] px-8 py-16">
        <p className="mb-4 text-danger">{loadError ?? "Grup bulunamadı."}</p>
        <button
          onClick={() => setRetryTick((t) => t + 1)}
          className="font-mono text-xs text-text-muted underline underline-offset-2 hover:text-text-primary"
        >
          Tekrar dene
        </button>
      </main>
    );
  }

  const backdrop = backdropUrl(group.show.backdropPath);

  return (
    <main className="mx-auto w-full max-w-[1180px] px-8 py-16">
      <motion.div
        key={group.id}
        initial={{ opacity: 0, scale: 1.02 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative mb-8 overflow-hidden rounded border border-screen-line"
      >
        {backdrop && (
          <Image
            src={backdrop}
            alt=""
            fill
            sizes="1180px"
            priority
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-screen via-screen/70 to-screen/20" />
        <div className="sprocket-strip sprocket-strip-live absolute inset-x-0 top-0 z-10" />
        <div className="sprocket-strip sprocket-strip-live absolute inset-x-0 bottom-0 z-10" />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="relative flex items-end justify-between gap-6 px-6 pt-24 pb-6"
        >
          <div className="flex items-end gap-4">
            {group.show.tmdbId ? (
              <Link href={`/dizi/${group.show.tmdbId}`} className="shrink-0 transition-opacity hover:opacity-80">
                <PosterThumb
                  title={group.show.title}
                  posterPath={group.show.posterPath}
                  width={64}
                  height={96}
                  className="shadow-[0_10px_24px_rgba(0,0,0,0.5)]"
                />
              </Link>
            ) : (
              <PosterThumb
                title={group.show.title}
                posterPath={group.show.posterPath}
                width={64}
                height={96}
                className="shrink-0 shadow-[0_10px_24px_rgba(0,0,0,0.5)]"
              />
            )}
            <div>
              {editingName ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    autoFocus
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename();
                      if (e.key === "Escape") setEditingName(false);
                    }}
                    className="border-b-2 border-signal bg-transparent font-display text-3xl text-text-primary outline-none"
                  />
                  <button
                    onClick={handleRename}
                    disabled={renaming}
                    className="font-mono text-xs text-sync hover:text-text-primary disabled:opacity-60"
                  >
                    {renaming ? "…" : "kaydet"}
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    className="font-mono text-xs text-text-muted hover:text-text-primary"
                  >
                    vazgeç
                  </button>
                </div>
              ) : (
                <h1 className="group/name flex items-center gap-2 font-display text-3xl text-text-primary">
                  {group.name}
                  {me?.id === group.ownerId && (
                    <button
                      onClick={() => {
                        setNameDraft(group.name);
                        setEditingName(true);
                      }}
                      aria-label="Grup adını değiştir"
                      className="font-mono text-sm text-text-muted opacity-0 transition-opacity hover:text-signal group-hover/name:opacity-100"
                    >
                      ✎
                    </button>
                  )}
                </h1>
              )}
              <div className="mt-2 flex items-center gap-2 font-mono text-xs text-text-muted">
                {group.show.tmdbId ? (
                  <Link href={`/dizi/${group.show.tmdbId}`} className="border-b border-dashed border-screen-line hover:text-text-primary">
                    {group.show.title}
                  </Link>
                ) : (
                  group.show.title
                )}
                <RatingBadge voteAverage={group.show.voteAverage} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={handleCopyInvite}
              initial={{ opacity: 0, scale: 0.85, rotate: 3 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 20, delay: 0.2 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="rounded border border-screen-line bg-screen-glow px-4 py-2.5 font-mono text-xs text-text-muted transition-colors hover:border-signal hover:bg-signal-soft"
            >
              {copied ? (
                <span className="text-sync">Bağlantı kopyalandı</span>
              ) : (
                <>
                  davet kodu <span className="text-text-primary">{group.inviteCode}</span> · kopyala
                </>
              )}
            </motion.button>
            <motion.button
              onClick={handleShareInvite}
              aria-label="Daveti paylaş"
              initial={{ opacity: 0, scale: 0.85, rotate: -3 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 20, delay: 0.25 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="rounded border border-screen-line bg-screen-glow p-2.5 text-text-muted transition-colors hover:border-signal hover:bg-signal-soft"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <path d="M8.6 10.5 15.4 6.5M8.6 13.5l6.8 4" />
              </svg>
            </motion.button>
            <InviteQr url={`${typeof window !== "undefined" ? window.location.origin : ""}/katil/${group.inviteCode}`} />
          </div>
        </motion.div>
      </motion.div>

      {nextEpisode && (
        <div className="mb-6">
          <NextEpisodeBanner nextEpisode={nextEpisode} />
        </div>
      )}

      {notice && (
        <p className="mb-6 rounded border border-screen-line bg-screen-glow px-4 py-3 text-sm text-danger">
          {notice}
        </p>
      )}

      <div className="mb-6">
        <WatchTogether
          groupId={group.id}
          videoId={group.nowPlayingVideoId}
          dailymotionId={group.nowPlayingDailymotionId}
          externalUrl={group.nowPlayingExternalUrl}
          embeddable={group.nowPlayingEmbeddable}
          showTitle={group.show.title}
          positions={[...watchPositions.values()]}
          myUserId={me?.id ?? ""}
          onEpisodeDetected={setEpisode}
          onSharePosition={handleSharePosition}
        />
      </div>

      <div className="grid grid-cols-[1.1fr_0.9fr] gap-6 max-[900px]:grid-cols-1">
        <div className="space-y-6">
          <SyncTicker showTitle={group.show.title} showSubtitle="grup takibi" members={members} />

          <div className="flex flex-wrap items-end gap-4 rounded border border-screen-line bg-screen-glow px-5 py-4">
            <label>
              <span className="mb-1.5 block font-mono text-xs tracking-[0.08em] text-text-muted uppercase">
                Sezon
              </span>
              <input
                type="number"
                min={1}
                value={season}
                onChange={(e) => setSeason(Number(e.target.value))}
                className="w-20 rounded border border-screen-line bg-transparent px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-signal"
              />
            </label>
            <label>
              <span className="mb-1.5 block font-mono text-xs tracking-[0.08em] text-text-muted uppercase">
                Bölüm
              </span>
              <input
                type="number"
                min={1}
                value={episode}
                onChange={(e) => setEpisode(Number(e.target.value))}
                className="w-20 rounded border border-screen-line bg-transparent px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-signal"
              />
            </label>
            <motion.span
              initial={false}
              animate={{ opacity: saved ? 1 : 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-1.5 pb-2.5 font-mono text-xs text-sync"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-sync" />
              Yerin güncellendi
            </motion.span>
          </div>

          <GroupPoll groupId={group.id} />

          {me && (
            <GroupManagement
              group={group}
              myUserId={me.id}
              onLeftOrDeleted={() => router.push("/gruplarim")}
              onMemberRemoved={(userId) =>
                setGroup((prev) =>
                  prev ? { ...prev, members: prev.members.filter((m) => m.user.id !== userId) } : prev,
                )
              }
              onMemberModeratorChanged={(userId, isModerator) =>
                setGroup((prev) =>
                  prev
                    ? {
                        ...prev,
                        members: prev.members.map((m) =>
                          m.user.id === userId ? { ...m, isModerator } : m,
                        ),
                      }
                    : prev,
                )
              }
            />
          )}
        </div>

        <div className="h-[520px]">
          {me && (
            <ChatPanel
              messages={messages}
              viewerId={me.id}
              viewerSeason={season}
              viewerEpisode={episode}
              typingNames={[...typingUsers.values()]}
              memberNames={group.members.map((m) => m.user.displayName)}
              canModerate={
                group.ownerId === me.id ||
                group.members.some((m) => m.user.id === me.id && m.isModerator)
              }
              onSend={handleSend}
              onReact={handleReact}
              onTyping={handleTypingInput}
              onEdit={handleEditMessage}
              onDelete={handleDeleteMessage}
              onReport={handleReportMessage}
            />
          )}
        </div>
      </div>
    </main>
  );
}
