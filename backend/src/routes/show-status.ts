import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/require-auth.js";
import { upsertShowFromTmdb } from "../lib/show-sync.js";

export const showStatusRouter = Router();
showStatusRouter.use(requireAuth);

const STATUSES = ["watching", "completed", "want_to_watch"] as const;
export type ShowStatusValue = (typeof STATUSES)[number];

showStatusRouter.get("/mine", async (req, res) => {
  const statuses = await prisma.showStatus.findMany({
    where: { userId: req.userId! },
    include: { show: true },
    orderBy: { updatedAt: "desc" },
  });

  res.json(statuses.map((s) => ({ status: s.status, updatedAt: s.updatedAt, show: s.show })));
});

const setStatusSchema = z.object({
  status: z.enum(STATUSES),
  tmdbId: z.number().int().positive(),
  title: z.string().trim().min(1),
  posterPath: z.string().nullable().optional(),
  backdropPath: z.string().nullable().optional(),
  voteAverage: z.number().nullable().optional(),
});

// Bir dizi grup üyeliğinden bağımsız — kullanıcı hiç grup kurmadan/katılmadan
// bir diziyi "izliyorum/izledim/izlemek istiyorum" olarak işaretleyebilir.
showStatusRouter.put("/:tmdbId", async (req, res) => {
  const tmdbId = Number(req.params.tmdbId);
  const parsed = setStatusSchema.safeParse({ ...req.body, tmdbId });
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { status, title } = parsed.data;
  const show = await upsertShowFromTmdb(tmdbId, title);

  const saved = await prisma.showStatus.upsert({
    where: { userId_showId: { userId: req.userId!, showId: show.id } },
    update: { status },
    create: { userId: req.userId!, showId: show.id, status },
  });

  res.status(201).json({ status: saved.status, updatedAt: saved.updatedAt, show });
});

showStatusRouter.delete("/:tmdbId", async (req, res) => {
  const show = await prisma.show.findUnique({ where: { tmdbId: Number(req.params.tmdbId) } });
  if (show) {
    await prisma.showStatus
      .delete({ where: { userId_showId: { userId: req.userId!, showId: show.id } } })
      .catch(() => null);
  }
  res.status(204).end();
});
