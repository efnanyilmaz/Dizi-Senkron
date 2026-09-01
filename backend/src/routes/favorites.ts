import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/require-auth.js";
import { upsertShowFromTmdb } from "../lib/show-sync.js";

export const favoritesRouter = Router();
favoritesRouter.use(requireAuth);

favoritesRouter.get("/mine", async (req, res) => {
  const favorites = await prisma.favorite.findMany({
    where: { userId: req.userId! },
    include: { show: true },
    orderBy: { createdAt: "desc" },
  });

  res.json(favorites.map((f) => f.show));
});

const addFavoriteSchema = z.object({
  tmdbId: z.number().int().positive(),
  title: z.string().trim().min(1),
  posterPath: z.string().nullable().optional(),
  backdropPath: z.string().nullable().optional(),
  voteAverage: z.number().nullable().optional(),
});

favoritesRouter.post("/", async (req, res) => {
  const parsed = addFavoriteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const show = await upsertShowFromTmdb(parsed.data.tmdbId, parsed.data.title);

  await prisma.favorite.upsert({
    where: { userId_showId: { userId: req.userId!, showId: show.id } },
    update: {},
    create: { userId: req.userId!, showId: show.id },
  });

  res.status(201).json(show);
});

favoritesRouter.delete("/:showId", async (req, res) => {
  await prisma.favorite
    .delete({
      where: { userId_showId: { userId: req.userId!, showId: req.params.showId } },
    })
    .catch(() => null);

  res.status(204).end();
});
