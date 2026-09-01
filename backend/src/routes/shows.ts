import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/require-auth.js";
import { searchCuratedShows, trendingTvShows, getShowDetails, getTvGenres, discoverShows } from "../lib/tmdb.js";
import { upsertShowFromTmdb } from "../lib/show-sync.js";

export const showsRouter = Router();

// Gezinme uç noktaları (arama, trend, dizi detayı) girişsiz de erişilebilir —
// bir ziyaretçi hesap açmadan katalogu keşfedebilsin diye. Grup oluşturma ve
// favorileme gibi eylemler hâlâ girişe kilitli.
showsRouter.get("/search", async (req, res) => {
  const query = String(req.query.q ?? "").trim();
  if (!query) {
    return res.json([]);
  }
  const results = await searchCuratedShows(query);
  res.json(results);
});

showsRouter.get("/trending", async (_req, res) => {
  const results = await trendingTvShows();
  res.json(results);
});

showsRouter.get("/genres", async (_req, res) => {
  const genres = await getTvGenres();
  res.json(genres);
});

showsRouter.get("/discover", async (req, res) => {
  const genre = req.query.genre ? Number(req.query.genre) : null;
  const cursor = Math.max(1, Number(req.query.cursor) || 1);
  if (genre !== null && (!Number.isInteger(genre) || genre <= 0)) {
    return res.status(400).json({ error: "Geçersiz tür kimliği." });
  }

  const { results, hasMore, nextCursor } = await discoverShows(genre, cursor);
  res.json({ results, hasMore, nextCursor });
});

showsRouter.get("/tmdb/:tmdbId", async (req, res) => {
  const tmdbId = Number(req.params.tmdbId);
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    return res.status(400).json({ error: "Geçersiz dizi kimliği." });
  }

  const details = await getShowDetails(tmdbId);
  if (!details) {
    return res.status(404).json({ error: "Dizi bulunamadı." });
  }

  res.json(details);
});

const createShowSchema = z.object({
  tmdbId: z.number().int().positive(),
  title: z.string().trim().min(1, "Dizi adı gerekli."),
  posterPath: z.string().nullable().optional(),
  backdropPath: z.string().nullable().optional(),
  voteAverage: z.number().nullable().optional(),
});

showsRouter.post("/", requireAuth, async (req, res) => {
  const parsed = createShowSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  // Poster/backdrop/puan gibi görsel alanlar istemciden gelen değere değil,
  // TMDB'den taze çekilen veriye göre yazılır — istemci eksik/yanlış bir şey
  // gönderse bile (ör. bir test/entegrasyon hatası) kayıt bozuk kalmaz, her
  // dokunuşta kendini düzeltir.
  const show = await upsertShowFromTmdb(parsed.data.tmdbId, parsed.data.title);

  res.status(201).json(show);
});
