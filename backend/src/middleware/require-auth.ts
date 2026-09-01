import type { NextFunction, Request, Response } from "express";
import { SESSION_COOKIE, verifySession } from "../lib/auth.js";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    return res.status(401).json({ error: "Oturum açman gerekiyor." });
  }

  try {
    const payload = verifySession(token);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Oturum süresi dolmuş, tekrar giriş yap." });
  }
}
