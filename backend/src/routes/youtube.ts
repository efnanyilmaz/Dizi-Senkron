import { Router } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import {
  findShowChannel,
  getVideoInfo,
  isEpisodeLength,
  searchYoutubeVideos,
  YoutubeQuotaError,
} from "../lib/youtube.js";

export const youtubeRouter = Router();

youtubeRouter.get("/channel", requireAuth, async (req, res) => {
  const title = String(req.query.title ?? "").trim();
  if (!title) {
    return res.json(null);
  }
  const channel = await findShowChannel(title);
  res.json(channel);
});

youtubeRouter.get("/search", requireAuth, async (req, res) => {
  const query = String(req.query.q ?? "").trim();
  if (!query) {
    return res.json([]);
  }
  const channelId = req.query.channelId ? String(req.query.channelId) : undefined;

  try {
    let results = await searchYoutubeVideos(query, channelId);
    // Dizinin tespit edilen kanalı hiç embeddable sonuç vermiyorsa (bkz.
    // /validate'teki not), kanala kilitlenmeden tekrar dene — hiç sonuç
    // göstermemek yerine oynatılabilir başka kaynaklar sunulsun.
    if (results.length === 0 && channelId) {
      results = await searchYoutubeVideos(query);
    }
    res.json(results);
  } catch (err) {
    if (err instanceof YoutubeQuotaError) {
      return res.status(429).json({ error: err.message });
    }
    throw err;
  }
});

// Kullanıcı elle bir YouTube linki yapıştırdığında, o videonun gerçekten bir
// bölüm olup olmadığını (süre) doğrular. Bilerek "resmi kanaldan mı" diye
// bakmıyoruz — dizinin tespit edilen kanalı embeddable olmayan videolar
// yüklüyorsa (bazı yayıncılar gömmeyi kapatıyor), bu kontrol kullanıcının
// elle bulduğu, gerçekten oynatılabilir başka bir kaynağı gereksiz yere
// reddedip çıkmaz sokağa sokuyordu. Gömme kapalıysa da artık reddetmiyoruz —
// `embeddable:false` dönüyoruz, istemci bunu "harici link" moduna (oynatıcı
// yerine dışarıya link + elle senkron) düşürüyor.
youtubeRouter.get("/validate", requireAuth, async (req, res) => {
  const videoId = String(req.query.videoId ?? "").trim();
  if (!videoId) {
    return res.status(400).json({ error: "Video kimliği eksik." });
  }

  try {
    const info = await getVideoInfo(videoId);
    if (!info) {
      return res.status(404).json({ error: "Bu video bulunamadı." });
    }
    if (!isEpisodeLength(info.durationSeconds)) {
      return res
        .status(422)
        .json({ error: "Bu link bir bölüm gibi görünmüyor — fragman veya klip olabilir." });
    }
    res.json({ ok: true, title: info.title, embeddable: info.embeddable });
  } catch (err) {
    if (err instanceof YoutubeQuotaError) {
      return res.status(429).json({ error: err.message });
    }
    throw err;
  }
});
