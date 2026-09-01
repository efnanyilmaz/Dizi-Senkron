import type { Server as HttpServer } from "node:http";
import { parse } from "cookie";
import { Server, type Socket } from "socket.io";
import { SESSION_COOKIE, verifySession } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";

type AuthedSocket = Socket & { data: { userId: string; displayName?: string } };

function roomFor(groupId: string) {
  return `group:${groupId}`;
}

function isMember(groupId: string, userId: string) {
  return prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
}

// Bir olay işleyicisi reddedilirse süreci çökertmek yerine bağlantıya hata bildirir.
function onEvent<Args extends unknown[]>(
  socket: AuthedSocket,
  handler: (...args: Args) => Promise<unknown>,
) {
  return async (...args: Args) => {
    try {
      await handler(...args);
    } catch (err) {
      console.error(err);
      socket.emit("error", { message: "Beklenmedik bir hata oluştu." });
    }
  };
}

async function currentReactions(messageId: string) {
  return prisma.messageReaction.findMany({
    where: { messageId },
    select: { id: true, emoji: true, userId: true },
  });
}

export function createSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.frontendUrl, credentials: true },
  });

  // groupId -> userId -> o kullanıcının bu gruba açık soket bağlantı sayısı.
  // Aynı kullanıcı birden fazla sekme açabildiği için basit bir sayaç tutulur
  // — sıfıra inince gerçekten çevrimdışı sayılır.
  const presence = new Map<string, Map<string, number>>();

  function onlineUserIds(groupId: string): string[] {
    return [...(presence.get(groupId)?.keys() ?? [])];
  }

  function broadcastPresence(groupId: string) {
    io.to(roomFor(groupId)).emit("presence_updated", { userIds: onlineUserIds(groupId) });
  }

  function addPresence(groupId: string, userId: string) {
    const group = presence.get(groupId) ?? new Map<string, number>();
    group.set(userId, (group.get(userId) ?? 0) + 1);
    presence.set(groupId, group);
    broadcastPresence(groupId);
  }

  function removePresence(groupId: string, userId: string) {
    const group = presence.get(groupId);
    if (!group) return;
    const count = (group.get(userId) ?? 1) - 1;
    if (count <= 0) {
      group.delete(userId);
    } else {
      group.set(userId, count);
    }
    if (group.size === 0) presence.delete(groupId);
    broadcastPresence(groupId);
  }

  io.use((socket, next) => {
    const cookies = parse(socket.handshake.headers.cookie ?? "");
    const token = cookies[SESSION_COOKIE];
    if (!token) {
      return next(new Error("Oturum açman gerekiyor."));
    }
    try {
      const { userId } = verifySession(token);
      socket.data.userId = userId;
      next();
    } catch {
      next(new Error("Oturum süresi dolmuş, tekrar giriş yap."));
    }
  });

  // groupId -> "yazıyor" olarak işaretlenmiş userId'ler. Her giriş, istemci
  // birkaç saniyede bir yenilemezse (ya da typing_stop/disconnect ile) sunucu
  // tarafında otomatik olarak temizlenir — istemci sonsuza dek "yazıyor"
  // takılı kalmasın diye.
  const typingTimers = new Map<string, NodeJS.Timeout>();
  const TYPING_TIMEOUT_MS = 4000;

  function typingKey(groupId: string, userId: string) {
    return `${groupId}:${userId}`;
  }

  function broadcastTyping(groupId: string, userId: string, displayName: string, isTyping: boolean) {
    io.to(roomFor(groupId)).emit("user_typing", { userId, displayName, isTyping });
  }

  function stopTyping(groupId: string, userId: string, displayName: string) {
    const key = typingKey(groupId, userId);
    const timer = typingTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      typingTimers.delete(key);
      broadcastTyping(groupId, userId, displayName, false);
    }
  }

  io.on("connection", (socket: AuthedSocket) => {
    // Bu soketin katıldığı gruplar — bağlantı kesildiğinde presence'ı
    // temizlemek için hatırlanır.
    const joinedGroups = new Set<string>();

    socket.on(
      "join_group",
      onEvent(socket, async (groupId: string) => {
        if (!(await isMember(groupId, socket.data.userId))) {
          return socket.emit("error", { message: "Bu grubun üyesi değilsin." });
        }
        socket.join(roomFor(groupId));
        joinedGroups.add(groupId);
        addPresence(groupId, socket.data.userId);
        socket.emit("presence_updated", { userIds: onlineUserIds(groupId) });
      }),
    );

    socket.on(
      "typing_start",
      onEvent(socket, async ({ groupId }: { groupId: string }) => {
        if (!(await isMember(groupId, socket.data.userId))) return;
        if (!socket.data.displayName) {
          const user = await prisma.user.findUnique({
            where: { id: socket.data.userId },
            select: { displayName: true },
          });
          socket.data.displayName = user?.displayName ?? "Biri";
        }

        const key = typingKey(groupId, socket.data.userId);
        const existingTimer = typingTimers.get(key);
        if (existingTimer) clearTimeout(existingTimer);
        else broadcastTyping(groupId, socket.data.userId, socket.data.displayName, true);

        typingTimers.set(
          key,
          setTimeout(() => {
            typingTimers.delete(key);
            broadcastTyping(groupId, socket.data.userId, socket.data.displayName!, false);
          }, TYPING_TIMEOUT_MS),
        );
      }),
    );

    socket.on(
      "typing_stop",
      onEvent(socket, async ({ groupId }: { groupId: string }) => {
        stopTyping(groupId, socket.data.userId, socket.data.displayName ?? "Biri");
      }),
    );

    socket.on(
      "send_message",
      onEvent(socket, async ({ groupId, content }: { groupId: string; content: string }) => {
        const trimmed = content.trim();
        if (!trimmed) return;

        const membership = await isMember(groupId, socket.data.userId);
        if (!membership) {
          return socket.emit("error", { message: "Bu grubun üyesi değilsin." });
        }

        const message = await prisma.message.create({
          data: {
            groupId,
            userId: socket.data.userId,
            content: trimmed,
            // Spoiler koruması bu anlık görüntüyü kullanır — göndereni daha
            // sonra ilerlese/gerilese bile mesaj o anki bağlamında kalır.
            authorSeason: membership.currentSeason,
            authorEpisode: membership.currentEpisode,
          },
          include: {
            user: { select: { id: true, displayName: true, avatarUrl: true } },
            reactions: { select: { id: true, emoji: true, userId: true } },
          },
        });

        io.to(roomFor(groupId)).emit("message_received", message);
        stopTyping(groupId, socket.data.userId, socket.data.displayName ?? message.user.displayName);
      }),
    );

    socket.on(
      "edit_message",
      onEvent(
        socket,
        async ({ groupId, messageId, content }: { groupId: string; messageId: string; content: string }) => {
          const trimmed = content.trim();
          if (!trimmed) return;

          const existing = await prisma.message.findUnique({ where: { id: messageId } });
          if (!existing || existing.groupId !== groupId || existing.deletedAt) {
            return socket.emit("error", { message: "Mesaj bulunamadı." });
          }
          if (existing.userId !== socket.data.userId) {
            return socket.emit("error", { message: "Sadece kendi mesajını düzenleyebilirsin." });
          }

          const updated = await prisma.message.update({
            where: { id: messageId },
            data: { content: trimmed, editedAt: new Date() },
          });

          io.to(roomFor(groupId)).emit("message_edited", {
            id: updated.id,
            content: updated.content,
            editedAt: updated.editedAt,
          });
        },
      ),
    );

    socket.on(
      "delete_message",
      onEvent(socket, async ({ groupId, messageId }: { groupId: string; messageId: string }) => {
        const existing = await prisma.message.findUnique({ where: { id: messageId } });
        if (!existing || existing.groupId !== groupId || existing.deletedAt) {
          return socket.emit("error", { message: "Mesaj bulunamadı." });
        }
        if (existing.userId !== socket.data.userId) {
          // Yazarı değilse, sadece grup sahibi veya moderatörü başkasının
          // mesajını silebilir.
          const [group, membership] = await Promise.all([
            prisma.watchGroup.findUnique({ where: { id: groupId } }),
            prisma.groupMember.findUnique({
              where: { groupId_userId: { groupId, userId: socket.data.userId } },
            }),
          ]);
          const canModerate = group?.ownerId === socket.data.userId || membership?.isModerator;
          if (!canModerate) {
            return socket.emit("error", { message: "Sadece kendi mesajını silebilirsin." });
          }
        }

        const updated = await prisma.message.update({
          where: { id: messageId },
          data: { content: "", deletedAt: new Date() },
        });

        io.to(roomFor(groupId)).emit("message_deleted", { id: updated.id, deletedAt: updated.deletedAt });
      }),
    );

    socket.on(
      "toggle_reaction",
      onEvent(
        socket,
        async ({ groupId, messageId, emoji }: { groupId: string; messageId: string; emoji: string }) => {
          if (!(await isMember(groupId, socket.data.userId))) {
            return socket.emit("error", { message: "Bu grubun üyesi değilsin." });
          }

          const existing = await prisma.messageReaction.findUnique({
            where: { messageId_userId_emoji: { messageId, userId: socket.data.userId, emoji } },
          });

          if (existing) {
            await prisma.messageReaction.delete({ where: { id: existing.id } });
          } else {
            await prisma.messageReaction.create({
              data: { messageId, userId: socket.data.userId, emoji },
            });
          }

          io.to(roomFor(groupId)).emit("reactions_updated", {
            messageId,
            reactions: await currentReactions(messageId),
          });
        },
      ),
    );

    // Bir üye bir mesajı kurallara aykırı bulup bildirir. Sadece bildiren
    // tarafa yanıt gider — grubun geri kalanına yayınlanmaz, moderasyon
    // konusu üyeler arasında bir tartışmaya dönüşmesin diye.
    socket.on(
      "report_message",
      onEvent(
        socket,
        async ({
          groupId,
          messageId,
          reason,
        }: {
          groupId: string;
          messageId: string;
          reason?: string;
        }) => {
          if (!(await isMember(groupId, socket.data.userId))) {
            return socket.emit("error", { message: "Bu grubun üyesi değilsin." });
          }

          const message = await prisma.message.findUnique({ where: { id: messageId } });
          if (!message || message.groupId !== groupId) {
            return socket.emit("error", { message: "Mesaj bulunamadı." });
          }
          if (message.userId === socket.data.userId) {
            return socket.emit("error", { message: "Kendi mesajını bildiremezsin." });
          }

          const existing = await prisma.messageReport.findUnique({
            where: { messageId_reporterId: { messageId, reporterId: socket.data.userId } },
          });
          if (existing) {
            return socket.emit("error", { message: "Bu mesajı zaten bildirdin." });
          }

          await prisma.messageReport.create({
            data: {
              messageId,
              reporterId: socket.data.userId,
              reason: reason?.trim().slice(0, 300) || null,
            },
          });

          socket.emit("message_reported", { messageId });
        },
      ),
    );

    socket.on(
      "update_progress",
      onEvent(
        socket,
        async ({ groupId, season, episode }: { groupId: string; season: number; episode: number }) => {
          const membership = await prisma.groupMember
            .update({
              where: { groupId_userId: { groupId, userId: socket.data.userId } },
              data: { currentSeason: season, currentEpisode: episode },
            })
            .catch(() => null);

          if (!membership) {
            return socket.emit("error", { message: "Bu grubun üyesi değilsin." });
          }

          io.to(roomFor(groupId)).emit("progress_updated", {
            userId: socket.data.userId,
            season,
            episode,
          });
        },
      ),
    );

    socket.on(
      "set_video",
      onEvent(
        socket,
        async ({
          groupId,
          videoId,
          dailymotionId,
          externalUrl,
          embeddable,
        }: {
          groupId: string;
          videoId?: string;
          dailymotionId?: string;
          externalUrl?: string;
          embeddable: boolean;
        }) => {
          if (!(await isMember(groupId, socket.data.userId))) {
            return socket.emit("error", { message: "Bu grubun üyesi değilsin." });
          }

          // Üçünden sadece biri dolu olur — YouTube linkiyse videoId,
          // Dailymotion linkiyse dailymotionId, başka bir siteden (kanal
          // sitesi vb.) geldiyse externalUrl.
          await prisma.watchGroup.update({
            where: { id: groupId },
            data: {
              nowPlayingVideoId: videoId ?? null,
              nowPlayingDailymotionId: dailymotionId ?? null,
              nowPlayingExternalUrl: externalUrl ?? null,
              nowPlayingEmbeddable: embeddable,
            },
          });

          io.to(roomFor(groupId)).emit("video_changed", {
            videoId: videoId ?? null,
            dailymotionId: dailymotionId ?? null,
            externalUrl: externalUrl ?? null,
            embeddable,
          });
        },
      ),
    );

    socket.on(
      "player_action",
      onEvent(
        socket,
        async ({
          groupId,
          action,
          positionSeconds,
        }: {
          groupId: string;
          action: "play" | "pause";
          positionSeconds: number;
        }) => {
          if (!(await isMember(groupId, socket.data.userId))) {
            return socket.emit("error", { message: "Bu grubun üyesi değilsin." });
          }

          socket.to(roomFor(groupId)).emit("player_action", { action, positionSeconds });
        },
      ),
    );

    // Video gömülemediğinde (harici link modu) otomatik senkron mümkün
    // değil — üye kendi izlediği dakikayı elle bildirir, kalıcı tutulmaz,
    // sadece o an gruptaki herkese anlık yayınlanır.
    socket.on(
      "share_watch_position",
      onEvent(
        socket,
        async ({ groupId, positionLabel }: { groupId: string; positionLabel: string }) => {
          const trimmed = positionLabel.trim().slice(0, 20);
          if (!trimmed) return;
          if (!(await isMember(groupId, socket.data.userId))) {
            return socket.emit("error", { message: "Bu grubun üyesi değilsin." });
          }
          if (!socket.data.displayName) {
            const user = await prisma.user.findUnique({
              where: { id: socket.data.userId },
              select: { displayName: true },
            });
            socket.data.displayName = user?.displayName ?? "Biri";
          }

          io.to(roomFor(groupId)).emit("watch_position_updated", {
            userId: socket.data.userId,
            displayName: socket.data.displayName,
            positionLabel: trimmed,
          });
        },
      ),
    );

    socket.on("disconnect", () => {
      for (const groupId of joinedGroups) {
        removePresence(groupId, socket.data.userId);
        stopTyping(groupId, socket.data.userId, socket.data.displayName ?? "Biri");
      }
    });
  });

  return io;
}
