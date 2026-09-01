import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/require-auth.js";
import { generateInviteCode } from "../lib/invite-code.js";

export const groupsRouter = Router();
groupsRouter.use(requireAuth);

const memberSelect = {
  id: true,
  currentSeason: true,
  currentEpisode: true,
  joinedAt: true,
  isModerator: true,
  user: { select: { id: true, displayName: true, avatarUrl: true } },
} as const;

const createGroupSchema = z.object({
  showId: z.string().uuid(),
  name: z.string().trim().min(2, "Grup adı en az 2 karakter olmalı."),
  isPublic: z.boolean().optional(),
});

groupsRouter.post("/", async (req, res) => {
  const parsed = createGroupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { showId, name, isPublic } = parsed.data;

  const show = await prisma.show.findUnique({ where: { id: showId } });
  if (!show) {
    return res.status(404).json({ error: "Dizi bulunamadı." });
  }

  let inviteCode = generateInviteCode();
  while (await prisma.watchGroup.findUnique({ where: { inviteCode } })) {
    inviteCode = generateInviteCode();
  }

  const group = await prisma.watchGroup.create({
    data: {
      showId,
      name,
      inviteCode,
      isPublic: isPublic ?? false,
      ownerId: req.userId!,
      members: { create: { userId: req.userId! } },
    },
    include: { show: true, members: { select: memberSelect } },
  });

  res.status(201).json(group);
});

// Herkese açık gruplar — davet kodu gerekmeden keşfedilip katılınabilir.
// Kullanıcının zaten üye olduğu gruplar listeden çıkarılır.
groupsRouter.get("/public", async (req, res) => {
  const groups = await prisma.watchGroup.findMany({
    where: {
      isPublic: true,
      members: { none: { userId: req.userId! } },
    },
    include: { show: true, _count: { select: { members: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  res.json(
    groups.map((g) => {
      const { _count, ...group } = g;
      return { ...group, memberCount: _count.members };
    }),
  );
});

// Davet kodu olmadan, sadece herkese açık bir gruba doğrudan kimlikle katılma.
groupsRouter.post("/:id/join", async (req, res) => {
  const group = await prisma.watchGroup.findUnique({ where: { id: req.params.id } });
  if (!group || !group.isPublic) {
    return res.status(404).json({ error: "Grup bulunamadı." });
  }

  const membership = await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId: req.userId! } },
    update: {},
    create: { groupId: group.id, userId: req.userId! },
  });

  res.status(200).json({ groupId: group.id, membershipId: membership.id });
});

const joinGroupSchema = z.object({
  inviteCode: z.string().trim().min(1, "Davet kodu gerekli."),
});

groupsRouter.post("/join", async (req, res) => {
  const parsed = joinGroupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const group = await prisma.watchGroup.findUnique({
    where: { inviteCode: parsed.data.inviteCode.toUpperCase() },
  });
  if (!group) {
    return res.status(404).json({ error: "Bu davet koduyla bir grup bulunamadı." });
  }

  const membership = await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId: req.userId! } },
    update: {},
    create: { groupId: group.id, userId: req.userId! },
  });

  res.status(200).json({ groupId: group.id, membershipId: membership.id });
});

groupsRouter.get("/mine", async (req, res) => {
  const memberships = await prisma.groupMember.findMany({
    where: { userId: req.userId! },
    include: {
      group: {
        include: { show: true, _count: { select: { members: true } } },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  res.json(
    memberships.map((m) => {
      const { _count, ...group } = m.group;
      return {
        ...group,
        memberCount: _count.members,
        myProgress: { season: m.currentSeason, episode: m.currentEpisode },
      };
    }),
  );
});

groupsRouter.get("/by-invite/:code", async (req, res) => {
  const group = await prisma.watchGroup.findUnique({
    where: { inviteCode: req.params.code.toUpperCase() },
    include: { show: true, _count: { select: { members: true } } },
  });
  if (!group) {
    return res.status(404).json({ error: "Bu davet koduyla bir grup bulunamadı." });
  }

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: req.userId! } },
  });

  res.json({
    id: group.id,
    name: group.name,
    show: group.show,
    memberCount: group._count.members,
    alreadyMember: Boolean(membership),
  });
});

groupsRouter.get("/:id", async (req, res) => {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: req.params.id, userId: req.userId! } },
  });
  if (!membership) {
    return res.status(403).json({ error: "Bu grubun üyesi değilsin." });
  }

  const group = await prisma.watchGroup.findUnique({
    where: { id: req.params.id },
    include: {
      show: true,
      members: { select: memberSelect, orderBy: { joinedAt: "asc" } },
    },
  });
  if (!group) {
    return res.status(404).json({ error: "Grup bulunamadı." });
  }

  res.json(group);
});

const progressSchema = z.object({
  season: z.number().int().positive(),
  episode: z.number().int().positive(),
});

groupsRouter.patch("/:id/progress", async (req, res) => {
  const parsed = progressSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Geçerli bir sezon ve bölüm numarası gerekli." });
  }

  const membership = await prisma.groupMember.update({
    where: { groupId_userId: { groupId: req.params.id, userId: req.userId! } },
    data: { currentSeason: parsed.data.season, currentEpisode: parsed.data.episode },
  }).catch(() => null);

  if (!membership) {
    return res.status(403).json({ error: "Bu grubun üyesi değilsin." });
  }

  res.json(membership);
});

const renameGroupSchema = z.object({
  name: z.string().trim().min(2, "Grup adı en az 2 karakter olmalı."),
});

groupsRouter.patch("/:id", async (req, res) => {
  const parsed = renameGroupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const group = await prisma.watchGroup.findUnique({ where: { id: req.params.id } });
  if (!group) {
    return res.status(404).json({ error: "Grup bulunamadı." });
  }
  if (group.ownerId !== req.userId) {
    return res.status(403).json({ error: "Sadece grup sahibi grubun adını değiştirebilir." });
  }

  const updated = await prisma.watchGroup.update({
    where: { id: req.params.id },
    data: { name: parsed.data.name },
  });
  res.json(updated);
});

groupsRouter.delete("/:id", async (req, res) => {
  const group = await prisma.watchGroup.findUnique({ where: { id: req.params.id } });
  if (!group) {
    return res.status(404).json({ error: "Grup bulunamadı." });
  }
  if (group.ownerId !== req.userId) {
    return res.status(403).json({ error: "Sadece grup sahibi grubu silebilir." });
  }

  await prisma.watchGroup.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

groupsRouter.delete("/:id/leave", async (req, res) => {
  const group = await prisma.watchGroup.findUnique({ where: { id: req.params.id } });
  if (!group) {
    return res.status(404).json({ error: "Grup bulunamadı." });
  }

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: req.userId! } },
  });
  if (!membership) {
    return res.status(403).json({ error: "Bu grubun üyesi değilsin." });
  }

  if (group.ownerId !== req.userId) {
    await prisma.groupMember.delete({ where: { id: membership.id } });
    return res.status(204).end();
  }

  const nextOwner = await prisma.groupMember.findFirst({
    where: { groupId: group.id, userId: { not: req.userId! } },
    orderBy: { joinedAt: "asc" },
  });

  if (!nextOwner) {
    await prisma.watchGroup.delete({ where: { id: group.id } });
    return res.status(204).end();
  }

  await prisma.$transaction([
    prisma.watchGroup.update({ where: { id: group.id }, data: { ownerId: nextOwner.userId } }),
    prisma.groupMember.delete({ where: { id: membership.id } }),
  ]);
  res.status(204).end();
});

groupsRouter.delete("/:id/members/:userId", async (req, res) => {
  const group = await prisma.watchGroup.findUnique({ where: { id: req.params.id } });
  if (!group) {
    return res.status(404).json({ error: "Grup bulunamadı." });
  }
  if (req.params.userId === group.ownerId) {
    return res.status(400).json({ error: "Grup sahibi kendini çıkaramaz, grubu silmelisin." });
  }

  const isOwner = group.ownerId === req.userId;
  if (!isOwner) {
    const requester = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: req.userId! } },
    });
    const target = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: req.params.userId } },
    });
    // Moderatörler sıradan üyeleri çıkarabilir ama diğer moderatörleri çıkaramaz
    // — o yetki sadece grup sahibinde kalır.
    if (!requester?.isModerator || target?.isModerator) {
      return res.status(403).json({ error: "Bu üyeyi çıkarma yetkin yok." });
    }
  }

  const membership = await prisma.groupMember
    .delete({
      where: { groupId_userId: { groupId: group.id, userId: req.params.userId } },
    })
    .catch(() => null);

  if (!membership) {
    return res.status(404).json({ error: "Bu kullanıcı grubun üyesi değil." });
  }

  res.status(204).end();
});

const setModeratorSchema = z.object({ isModerator: z.boolean() });

groupsRouter.patch("/:id/members/:userId/moderator", async (req, res) => {
  const parsed = setModeratorSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Geçerli bir değer gerekli." });
  }

  const group = await prisma.watchGroup.findUnique({ where: { id: req.params.id } });
  if (!group) {
    return res.status(404).json({ error: "Grup bulunamadı." });
  }
  if (group.ownerId !== req.userId) {
    return res.status(403).json({ error: "Sadece grup sahibi moderatör atayabilir." });
  }
  if (req.params.userId === group.ownerId) {
    return res.status(400).json({ error: "Grup sahibi zaten en yetkili kişi." });
  }

  const membership = await prisma.groupMember
    .update({
      where: { groupId_userId: { groupId: group.id, userId: req.params.userId } },
      data: { isModerator: parsed.data.isModerator },
      select: memberSelect,
    })
    .catch(() => null);

  if (!membership) {
    return res.status(404).json({ error: "Bu kullanıcı grubun üyesi değil." });
  }

  res.json(membership);
});
