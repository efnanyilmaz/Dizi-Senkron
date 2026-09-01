import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  SESSION_COOKIE,
  RESET_TOKEN_TTL_MS,
  VERIFY_TOKEN_TTL_MS,
  generateResetToken,
  hashPassword,
  hashResetToken,
  sessionCookieOptions,
  signSession,
  verifyPassword,
  verifySession,
} from "../lib/auth.js";
import { requireAuth } from "../middleware/require-auth.js";
import { authLimiter } from "../middleware/rate-limit.js";
import {
  isMailerConfigured,
  sendEmailChangeConfirmation,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "../lib/mailer.js";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı."),
  displayName: z.string().trim().min(2, "Görünen ad en az 2 karakter olmalı."),
});

authRouter.post("/register", authLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { email, password, displayName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Bu e-posta ile zaten bir hesap var." });
  }

  const verifyToken = generateResetToken();
  const user = await prisma.user.create({
    data: {
      email,
      displayName,
      passwordHash: await hashPassword(password),
      verifyTokenHash: hashResetToken(verifyToken),
      verifyTokenExpiresAt: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
    },
  });

  const token = signSession({ userId: user.id });
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions);

  const verifyPath = `/e-posta-dogrula?token=${verifyToken}`;
  // Mailer ayarlıysa gerçek bir e-posta gider ve bağlantı yanıtta yer almaz;
  // ayarlı değilse (yerel geliştirme) önceki "test modu" davranışı sürer —
  // bağlantı doğrudan yanıtta döner. Gönderim burada AWAIT edilmiyor — SMTP
  // yavaş/engelli olduğunda (bazı host'larda çıkış portu kapalı) istek
  // askıda kalmasın diye, kayıt yanıtı e-posta beklemeden dönüyor.
  if (isMailerConfigured()) {
    sendVerificationEmail(user.email, user.displayName, verifyPath).catch((err) =>
      console.error("Doğrulama e-postası gönderilemedi:", err),
    );
  }
  res.status(201).json({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    ...(isMailerConfigured() ? {} : { verifyLink: verifyPath }),
  });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "E-posta ve şifre gerekli." });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ error: "E-posta veya şifre hatalı." });
  }

  const token = signSession({ userId: user.id });
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions);
  res.json({ id: user.id, email: user.email, displayName: user.displayName });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.status(204).end();
});

const forgotPasswordSchema = z.object({ email: z.string().email() });

authRouter.post("/forgot-password", authLimiter, async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Geçerli bir e-posta adresi gerekli." });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  // Hesap olsun olmasın aynı genel mesaj dönülür — aksi halde bir e-postanın
  // kayıtlı olup olmadığı buradan anlaşılabilir (kullanıcı numaralandırma).
  const genericResponse = {
    message: "Bu e-posta ile bir hesap varsa, sıfırlama bağlantısı hazırlandı.",
  };

  if (!user) {
    return res.json(genericResponse);
  }

  const token = generateResetToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetTokenHash: hashResetToken(token),
      resetTokenExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  const resetPath = `/sifre-sifirla?token=${token}`;
  if (isMailerConfigured()) {
    sendPasswordResetEmail(user.email, user.displayName, resetPath).catch((err) =>
      console.error("Şifre sıfırlama e-postası gönderilemedi:", err),
    );
  }
  res.json({
    ...genericResponse,
    ...(isMailerConfigured() ? {} : { resetLink: resetPath }),
  });
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, "Yeni şifre en az 8 karakter olmalı."),
});

authRouter.post("/reset-password", authLimiter, async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const tokenHash = hashResetToken(parsed.data.token);
  const user = await prisma.user.findFirst({
    where: { resetTokenHash: tokenHash, resetTokenExpiresAt: { gt: new Date() } },
  });

  if (!user) {
    return res.status(400).json({ error: "Bağlantının süresi dolmuş veya geçersiz." });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(parsed.data.newPassword),
      resetTokenHash: null,
      resetTokenExpiresAt: null,
    },
  });

  res.status(204).end();
});

// Bilerek requireAuth kullanmıyor: bu uç nokta her sayfada "oturum var mı?"
// diye sessizce yoklamak için çağrılıyor. 401 fırlatsaydı, girişsiz her
// ziyaretçide konsola gereksiz bir hata düşerdi — bunun yerine oturum
// yoksa/geçersizse 200 ile `null` dönüyor.
authRouter.get("/me", async (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    return res.json(null);
  }

  let userId: string;
  try {
    userId = verifySession(token).userId;
  } catch {
    return res.json(null);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, displayName: true, avatarUrl: true, emailVerifiedAt: true },
  });
  res.json(user ? { ...user, emailVerified: Boolean(user.emailVerifiedAt) } : null);
});

const verifyEmailSchema = z.object({ token: z.string().min(1) });

authRouter.post("/verify-email", authLimiter, async (req, res) => {
  const parsed = verifyEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Geçersiz bağlantı." });
  }

  const tokenHash = hashResetToken(parsed.data.token);
  const user = await prisma.user.findFirst({
    where: { verifyTokenHash: tokenHash, verifyTokenExpiresAt: { gt: new Date() } },
  });
  if (!user) {
    return res.status(400).json({ error: "Bağlantının süresi dolmuş veya geçersiz." });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date(), verifyTokenHash: null, verifyTokenExpiresAt: null },
  });
  res.status(204).end();
});

// Girişli kullanıcı doğrulama bağlantısını kaybettiyse ya da e-postası
// gelmediyse (test modunda zaten gelmiyor) yeni bir tane isteyebilir.
authRouter.post("/resend-verification", authLimiter, requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    return res.status(404).json({ error: "Kullanıcı bulunamadı." });
  }
  if (user.emailVerifiedAt) {
    return res.status(400).json({ error: "E-posta zaten doğrulanmış." });
  }

  const verifyToken = generateResetToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      verifyTokenHash: hashResetToken(verifyToken),
      verifyTokenExpiresAt: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
    },
  });

  const verifyPath = `/e-posta-dogrula?token=${verifyToken}`;
  if (isMailerConfigured()) {
    sendVerificationEmail(user.email, user.displayName, verifyPath).catch((err) =>
      console.error("Doğrulama e-postası gönderilemedi:", err),
    );
  }
  res.json(isMailerConfigured() ? {} : { verifyLink: verifyPath });
});

const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2, "Görünen ad en az 2 karakter olmalı."),
});

authRouter.patch("/me", requireAuth, async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { displayName: parsed.data.displayName },
    select: { id: true, email: true, displayName: true, avatarUrl: true },
  });
  res.json(user);
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Yeni şifre en az 8 karakter olmalı."),
});

authRouter.post("/change-password", authLimiter, requireAuth, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user || !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return res.status(401).json({ error: "Mevcut şifre hatalı." });
  }

  await prisma.user.update({
    where: { id: req.userId },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });
  res.status(204).end();
});

const changeEmailSchema = z.object({
  password: z.string().min(1),
  newEmail: z.string().email(),
});

authRouter.post("/change-email", authLimiter, requireAuth, async (req, res) => {
  const parsed = changeEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Geçerli bir e-posta adresi gerekli." });
  }
  const { password, newEmail } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ error: "Şifre hatalı." });
  }
  if (newEmail === user.email) {
    return res.status(400).json({ error: "Bu zaten mevcut e-posta adresin." });
  }

  const taken = await prisma.user.findUnique({ where: { email: newEmail } });
  if (taken) {
    return res.status(409).json({ error: "Bu e-posta ile zaten bir hesap var." });
  }

  const token = generateResetToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      pendingEmail: newEmail,
      emailChangeTokenHash: hashResetToken(token),
      emailChangeTokenExpiresAt: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
    },
  });

  // Onay linki YENİ adrese gider — eski hesabı ele geçiren biri e-postayı
  // kendi kontrolündeki bir adrese sessizce çeviremesin diye.
  const confirmPath = `/e-posta-degistir-onayla?token=${token}`;
  if (isMailerConfigured()) {
    sendEmailChangeConfirmation(newEmail, user.displayName, confirmPath).catch((err) =>
      console.error("E-posta değişikliği onay maili gönderilemedi:", err),
    );
  }
  res.json({
    pendingEmail: newEmail,
    ...(isMailerConfigured() ? {} : { confirmLink: confirmPath }),
  });
});

const confirmEmailChangeSchema = z.object({ token: z.string().min(1) });

authRouter.post("/confirm-email-change", authLimiter, async (req, res) => {
  const parsed = confirmEmailChangeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Geçersiz bağlantı." });
  }

  const tokenHash = hashResetToken(parsed.data.token);
  const user = await prisma.user.findFirst({
    where: { emailChangeTokenHash: tokenHash, emailChangeTokenExpiresAt: { gt: new Date() } },
  });
  if (!user || !user.pendingEmail) {
    return res.status(400).json({ error: "Bağlantının süresi dolmuş veya geçersiz." });
  }

  // Bekleme sırasında biri aynı adresi almış olabilir — son anda tekrar kontrol edilir.
  const taken = await prisma.user.findUnique({ where: { email: user.pendingEmail } });
  if (taken) {
    return res.status(409).json({ error: "Bu e-posta artık başka bir hesapta kullanılıyor." });
  }

  // Onay linki yeni adrese gittiği ve tıklandığı için, bu adresin sahibi
  // kanıtlanmış sayılır — ayrıca doğrulanmış işaretlenir.
  await prisma.user.update({
    where: { id: user.id },
    data: {
      email: user.pendingEmail,
      pendingEmail: null,
      emailChangeTokenHash: null,
      emailChangeTokenExpiresAt: null,
      emailVerifiedAt: new Date(),
      verifyTokenHash: null,
      verifyTokenExpiresAt: null,
    },
  });
  res.status(204).end();
});

const deleteAccountSchema = z.object({
  password: z.string().min(1),
});

authRouter.delete("/me", authLimiter, requireAuth, async (req, res) => {
  const parsed = deleteAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Şifreni girmen gerekiyor." });
  }

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({ error: "Şifre hatalı." });
  }

  // Sahip olduğun gruplarda başka üye varsa grup silinmeden önce sahiplik bir
  // sonraki üyeye devredilir — /groups/:id/leave ile aynı mantık. Kimse
  // kalmadıysa grup, kullanıcıyla birlikte kademeli olarak (cascade) silinir.
  const ownedGroups = await prisma.watchGroup.findMany({ where: { ownerId: req.userId } });
  for (const group of ownedGroups) {
    const nextOwner = await prisma.groupMember.findFirst({
      where: { groupId: group.id, userId: { not: req.userId! } },
      orderBy: { joinedAt: "asc" },
    });
    if (nextOwner) {
      await prisma.watchGroup.update({ where: { id: group.id }, data: { ownerId: nextOwner.userId } });
    }
  }

  await prisma.user.delete({ where: { id: req.userId } });
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.status(204).end();
});
