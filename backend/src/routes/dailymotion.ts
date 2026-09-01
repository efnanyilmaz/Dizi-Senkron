import { Router } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { getShowDetails } from "../lib/tmdb.js";
import {
  findDailymotionChannel,
  getDailymotionVideoInfo,
  isEpisodeLength,
  searchDailymotionVideos,
} from "../lib/dailymotion.js";

export const dailymotionRouter = Router();

dailymotionRouter.get("/channel", requireAuth, async (req, res) => {
  const title = String(req.query.title ?? "").trim();
  if (!title) {
    return res.json(null);
  }
  // tmdbId verilirse dizinin gerçek ilk yayın yılı öğrenilip hesap aramasına
  // geçirilir — bkz. findDailymotionChannel.
  const tmdbId = req.query.tmdbId ? Number(req.query.tmdbId) : null;
  const minYear = tmdbId ? (await getShowDetails(tmdbId))?.firstAirYear ?? null : null;
  const channel = await findDailymotionChannel(title, minYear);
  res.json(channel);
});

// Bilerek kanalsız arama yapmıyoruz — dizinin kendi hesabı tespit
// edilemiyorsa (yeni bir dizi, henüz yeterli bölüm yüklenmemiş olabilir)
// genel bir Dailymotion araması alakasız/yanlış dizilere ait videolar
// getirebiliyordu. Kanal yoksa ya da o kanalda sonuç çıkmıyorsa boş liste
// dönülür — kullanıcı isterse "link yapıştır" moduna geçer.
dailymotionRouter.get("/search", requireAuth, async (req, res) => {
  const query = String(req.query.q ?? "").trim();
  const ownerName = req.query.ownerName ? String(req.query.ownerName) : undefined;
  if (!query || !ownerName) {
    return res.json([]);
  }

  const results = await searchDailymotionVideos(query, ownerName);
  res.json(results);
});

// Kullanıcı elle bir Dailymotion linki yapıştırdığında, o videonun gerçekten
// bir bölüm olup olmadığını (süre) doğrular. YouTube'daki /validate ile aynı
// mantık: gömme kapalıysa da reddetmiyoruz, embeddable:false dönüp istemciye
// "harici link" moduna düşme kararını bırakıyoruz.
dailymotionRouter.get("/validate", requireAuth, async (req, res) => {
  const videoId = String(req.query.videoId ?? "").trim();
  if (!videoId) {
    return res.status(400).json({ error: "Video kimliği eksik." });
  }

  const info = await getDailymotionVideoInfo(videoId);
  if (!info) {
    return res.status(404).json({ error: "Bu video bulunamadı." });
  }
  if (!isEpisodeLength(info.durationSeconds)) {
    return res
      .status(422)
      .json({ error: "Bu link bir bölüm gibi görünmüyor — fragman veya klip olabilir." });
  }
  res.json({ ok: true, title: info.title, embeddable: info.embeddable });
});
