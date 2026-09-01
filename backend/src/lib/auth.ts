import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "./env.js";

export const SESSION_COOKIE = "frekans_session";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export type SessionPayload = { userId: string };

export function signSession(payload: SessionPayload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "7d" });
}

export function verifySession(token: string): SessionPayload {
  return jwt.verify(token, env.jwtSecret) as SessionPayload;
}

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 saat
export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 saat

// Şifre sıfırlama / e-posta doğrulama bağlantılarındaki ham token kullanıcıya
// gider, veritabanında sadece bunun hash'i tutulur — tıpkı şifre gibi, DB
// sızsa bile token doğrudan kullanılamaz. İki akış da aynı genel amaçlı
// üretim/hash fonksiyonlarını paylaşır.
export function generateResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Prod'da frontend (vercel.app) ve backend (onrender.com gibi) farklı
// domain'lerde yaşıyor — tarayıcı bunu "cross-site" sayar. SameSite=Lax
// cookie'ler cross-site fetch/XHR isteklerinde GÖNDERİLMEZ (sadece üst
// seviye navigasyonlarda), yani frontend'in backend'e attığı her API isteği
// oturumsuz görünür ve giriş sessizce bozulur. "None" cross-site fetch'te de
// gönderilmesini sağlar, ama tarayıcılar SameSite=None'ı Secure olmadan
// reddeder — ikisi birlikte gitmek zorunda. Local dev'de (aynı "site" sayılan
// localhost:3000 ↔ localhost:4000) Lax zaten yeterli ve Secure gerektirmediği
// için orada dokunmuyoruz.
const isProd = env.nodeEnv === "production";
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: (isProd ? "none" : "lax") as "none" | "lax",
  secure: isProd,
  maxAge: SESSION_MAX_AGE_MS,
  path: "/",
};
