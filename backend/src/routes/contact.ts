import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const contactRouter = Router();

const contactSchema = z.object({
  name: z.string().trim().min(1, "Adın gerekli.").max(120),
  email: z.string().trim().email("Geçerli bir e-posta adresi gir."),
  message: z.string().trim().min(10, "Mesajın en az 10 karakter olmalı.").max(4000),
});

// Giriş gerektirmez — herkes iletişim formunu doldurabilir. Şimdilik bir
// e-posta gönderim servisi bağlı olmadığından mesaj doğrudan veritabanına
// yazılır; gerçek bir yayında burada ayrıca bir bildirim e-postası da
// gönderilmeli.
contactRouter.post("/", async (req, res) => {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  await prisma.contactMessage.create({ data: parsed.data });

  res.status(201).json({ ok: true });
});
