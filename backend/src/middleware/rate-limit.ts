import rateLimit from "express-rate-limit";

// Genel API trafiği için makul bir üst sınır — normal kullanımı etkilemez,
// sadece kötüye kullanımı/otomatik saldırıları yavaşlatır.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Çok fazla istek gönderildi, birazdan tekrar dene." },
});

// Giriş/kayıt uç noktaları için daha sıkı bir sınır — kaba kuvvet (brute-force)
// şifre denemelerini engellemek amacıyla.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Çok fazla giriş denemesi, birazdan tekrar dene." },
});

// Video araması (YouTube + Dailymotion) günlük kotayı hızla tüketebildiği
// için ayrıca sınırlanır. Arama artık iki platformda birden (kanal tespiti +
// arama, her ikisi de paralel) yapıldığından tek bir arama eskisinin ~2 katı
// istek gönderiyor — sınır buna göre yükseltildi.
export const youtubeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Çok fazla arama yapıldı, birazdan tekrar dene." },
});
