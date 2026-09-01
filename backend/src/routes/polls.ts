import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/require-auth.js";
import { upsertShowFromTmdb } from "../lib/show-sync.js";

export const pollsRouter = Router();
pollsRouter.use(requireAuth);

async function requireMembership(groupId: string, userId: string) {
  return prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });
}

// Grup sahibi ya da sahibin atadığı moderatör — anket kapatma/dizi değiştirme
// gibi yönetimsel eylemler için ortak yetki kontrolü.
async function canModerateGroup(groupId: string, userId: string) {
  const [group, membership] = await Promise.all([
    prisma.watchGroup.findUnique({ where: { id: groupId } }),
    prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } }),
  ]);
  return group?.ownerId === userId || Boolean(membership?.isModerator);
}

const pollInclude = {
  creator: { select: { id: true, displayName: true } },
  options: {
    include: {
      votes: { select: { userId: true } },
    },
  },
} as const;

function serializePoll(poll: {
  id: string;
  isOpen: boolean;
  createdAt: Date;
  createdBy: string;
  showSwitchedAt: Date | null;
  creator: { id: string; displayName: string };
  options: { id: string; label: string; tmdbId: number | null; posterPath: string | null; votes: { userId: string }[] }[];
}, myUserId: string, canModerate: boolean) {
  const canClose = poll.createdBy === myUserId || canModerate;
  const options = poll.options.map((o) => ({
    id: o.id,
    label: o.label,
    tmdbId: o.tmdbId,
    posterPath: o.posterPath,
    voteCount: o.votes.length,
    votedByMe: o.votes.some((v) => v.userId === myUserId),
  }));

  // Kazanan — en çok oy alan, birden fazlaysa (eşitlik) belirsiz bırakılır
  // (switch teklif edilmez), TMDB'ye bağlı olmayan seçenekler de geçersizdir.
  const maxVotes = Math.max(0, ...options.map((o) => o.voteCount));
  const leaders = options.filter((o) => o.voteCount === maxVotes && maxVotes > 0);
  const winner = !poll.isOpen && leaders.length === 1 && leaders[0].tmdbId ? leaders[0] : null;

  return {
    id: poll.id,
    isOpen: poll.isOpen,
    createdAt: poll.createdAt,
    creator: poll.creator,
    canClose,
    canSwitchShow: canClose && Boolean(winner) && !poll.showSwitchedAt,
    showSwitched: Boolean(poll.showSwitchedAt),
    winningOptionId: winner?.id ?? null,
    options,
  };
}

// Grubun şu anki açık anketi — yoksa null.
pollsRouter.get("/:groupId/poll", async (req, res) => {
  if (!(await requireMembership(req.params.groupId, req.userId!))) {
    return res.status(403).json({ error: "Bu grubun üyesi değilsin." });
  }

  // En son anket döner — açıksa oylama, kapalıysa (henüz dizi değişimi
  // uygulanmadıysa) sonuç ekranı gösterilir. Yeni bir anket açılınca öncekinin
  // yerini otomatik alır.
  const [poll, canModerate] = await Promise.all([
    prisma.poll.findFirst({
      where: { groupId: req.params.groupId },
      include: pollInclude,
      orderBy: { createdAt: "desc" },
    }),
    canModerateGroup(req.params.groupId, req.userId!),
  ]);

  const hidden = poll && !poll.isOpen && poll.showSwitchedAt;
  res.json(poll && !hidden ? serializePoll(poll, req.userId!, canModerate) : null);
});

const optionInputSchema = z.union([
  z.string().trim().min(1),
  z.object({
    label: z.string().trim().min(1),
    tmdbId: z.number().int().positive().optional(),
    posterPath: z.string().nullable().optional(),
  }),
]);

function normalizeOption(input: z.infer<typeof optionInputSchema>) {
  return typeof input === "string"
    ? { label: input, tmdbId: undefined, posterPath: undefined }
    : { label: input.label, tmdbId: input.tmdbId, posterPath: input.posterPath ?? undefined };
}

const createPollSchema = z.object({
  options: z.array(optionInputSchema).min(2, "En az 2 aday dizi gerekli.").max(8),
});

pollsRouter.post("/:groupId/poll", async (req, res) => {
  if (!(await requireMembership(req.params.groupId, req.userId!))) {
    return res.status(403).json({ error: "Bu grubun üyesi değilsin." });
  }

  const parsed = createPollSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const existing = await prisma.poll.findFirst({
    where: { groupId: req.params.groupId, isOpen: true },
  });
  if (existing) {
    return res.status(409).json({ error: "Zaten açık bir anket var." });
  }

  const poll = await prisma.poll.create({
    data: {
      groupId: req.params.groupId,
      createdBy: req.userId!,
      options: { create: parsed.data.options.map(normalizeOption) },
    },
    include: pollInclude,
  });

  const canModerate = await canModerateGroup(req.params.groupId, req.userId!);
  res.status(201).json(serializePoll(poll, req.userId!, canModerate));
});

const addOptionSchema = z.object({
  label: z.string().trim().min(1, "Dizi adı gerekli."),
  tmdbId: z.number().int().positive().optional(),
  posterPath: z.string().nullable().optional(),
});

pollsRouter.post("/:groupId/poll/:pollId/options", async (req, res) => {
  if (!(await requireMembership(req.params.groupId, req.userId!))) {
    return res.status(403).json({ error: "Bu grubun üyesi değilsin." });
  }

  const parsed = addOptionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const poll = await prisma.poll.findUnique({ where: { id: req.params.pollId } });
  if (!poll || poll.groupId !== req.params.groupId || !poll.isOpen) {
    return res.status(404).json({ error: "Açık anket bulunamadı." });
  }

  await prisma.pollOption.create({
    data: {
      pollId: poll.id,
      label: parsed.data.label,
      tmdbId: parsed.data.tmdbId,
      posterPath: parsed.data.posterPath ?? undefined,
    },
  });

  const [updated, canModerate] = await Promise.all([
    prisma.poll.findUniqueOrThrow({ where: { id: poll.id }, include: pollInclude }),
    canModerateGroup(req.params.groupId, req.userId!),
  ]);
  res.status(201).json(serializePoll(updated, req.userId!, canModerate));
});

const voteSchema = z.object({ optionId: z.string().uuid() });

pollsRouter.post("/:groupId/poll/:pollId/vote", async (req, res) => {
  if (!(await requireMembership(req.params.groupId, req.userId!))) {
    return res.status(403).json({ error: "Bu grubun üyesi değilsin." });
  }

  const parsed = voteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Geçerli bir seçenek gerekli." });
  }

  const poll = await prisma.poll.findUnique({
    where: { id: req.params.pollId },
    include: { options: true },
  });
  if (!poll || poll.groupId !== req.params.groupId || !poll.isOpen) {
    return res.status(404).json({ error: "Açık anket bulunamadı." });
  }
  const option = poll.options.find((o) => o.id === parsed.data.optionId);
  if (!option) {
    return res.status(404).json({ error: "Seçenek bulunamadı." });
  }

  // Kişi başı tek oy — önce bu anketteki eski oyunu (varsa) kaldırılır.
  await prisma.pollVote.deleteMany({
    where: { userId: req.userId!, optionId: { in: poll.options.map((o) => o.id) } },
  });
  await prisma.pollVote.create({ data: { optionId: option.id, userId: req.userId! } });

  const [updated, canModerate] = await Promise.all([
    prisma.poll.findUniqueOrThrow({ where: { id: poll.id }, include: pollInclude }),
    canModerateGroup(req.params.groupId, req.userId!),
  ]);
  res.json(serializePoll(updated, req.userId!, canModerate));
});

pollsRouter.post("/:groupId/poll/:pollId/close", async (req, res) => {
  if (!(await requireMembership(req.params.groupId, req.userId!))) {
    return res.status(403).json({ error: "Bu grubun üyesi değilsin." });
  }

  const poll = await prisma.poll.findUnique({ where: { id: req.params.pollId } });
  if (!poll || poll.groupId !== req.params.groupId) {
    return res.status(404).json({ error: "Anket bulunamadı." });
  }
  if (poll.createdBy !== req.userId && !(await canModerateGroup(req.params.groupId, req.userId!))) {
    return res.status(403).json({ error: "Sadece anketi açan, grup sahibi veya moderatör kapatabilir." });
  }

  await prisma.poll.update({ where: { id: poll.id }, data: { isOpen: false } });
  res.status(204).end();
});

// Kapanmış anketin tek kazananı gerçek bir TMDB dizisiyse, grup sahibi ya da
// anketi açan kişi grubu doğrudan o diziye geçirebilir — herkesin ilerlemesi
// sıfırlanır, tıpkı yeni bir grup gibi baştan başlanır.
pollsRouter.post("/:groupId/poll/:pollId/switch-show", async (req, res) => {
  if (!(await requireMembership(req.params.groupId, req.userId!))) {
    return res.status(403).json({ error: "Bu grubun üyesi değilsin." });
  }

  const group = await prisma.watchGroup.findUnique({ where: { id: req.params.groupId } });
  const poll = await prisma.poll.findUnique({
    where: { id: req.params.pollId },
    include: { options: { include: { votes: true } } },
  });
  if (!group || !poll || poll.groupId !== req.params.groupId) {
    return res.status(404).json({ error: "Anket bulunamadı." });
  }
  if (poll.createdBy !== req.userId && !(await canModerateGroup(req.params.groupId, req.userId!))) {
    return res.status(403).json({ error: "Sadece anketi açan, grup sahibi veya moderatör diziyi değiştirebilir." });
  }
  if (poll.isOpen) {
    return res.status(400).json({ error: "Önce anketi kapatman gerekiyor." });
  }
  if (poll.showSwitchedAt) {
    return res.status(409).json({ error: "Bu anketin sonucu zaten uygulandı." });
  }

  const maxVotes = Math.max(0, ...poll.options.map((o) => o.votes.length));
  const leaders = poll.options.filter((o) => o.votes.length === maxVotes && maxVotes > 0);
  const winner = leaders.length === 1 ? leaders[0] : null;
  if (!winner || !winner.tmdbId) {
    return res.status(400).json({ error: "Tek ve net bir kazanan yok." });
  }

  const show = await upsertShowFromTmdb(winner.tmdbId, winner.label);

  await prisma.$transaction([
    prisma.watchGroup.update({ where: { id: group.id }, data: { showId: show.id, nowPlayingVideoId: null } }),
    prisma.groupMember.updateMany({ where: { groupId: group.id }, data: { currentSeason: 1, currentEpisode: 1 } }),
    prisma.poll.update({ where: { id: poll.id }, data: { showSwitchedAt: new Date() } }),
  ]);

  res.json({ show });
});
