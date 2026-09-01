import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/require-auth.js";

export const messagesRouter = Router();
messagesRouter.use(requireAuth);

messagesRouter.get("/:groupId/messages", async (req, res) => {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: req.params.groupId, userId: req.userId! } },
  });
  if (!membership) {
    return res.status(403).json({ error: "Bu grubun üyesi değilsin." });
  }

  const cursor = req.query.before ? new Date(String(req.query.before)) : undefined;

  const messages = await prisma.message.findMany({
    where: { groupId: req.params.groupId, ...(cursor && { createdAt: { lt: cursor } }) },
    include: {
      user: { select: { id: true, displayName: true, avatarUrl: true } },
      reactions: { select: { id: true, emoji: true, userId: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  res.json(messages.reverse());
});
