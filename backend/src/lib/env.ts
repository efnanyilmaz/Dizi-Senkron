import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Ortam değişkeni eksik: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: required("JWT_SECRET"),
  databaseUrl: required("DATABASE_URL"),
  tmdbApiKey: required("TMDB_API_KEY"),
  youtubeApiKey: process.env.YOUTUBE_API_KEY ?? null,
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  nodeEnv: process.env.NODE_ENV ?? "development",
  // Hepsi opsiyonel — hiçbiri set edilmemişse mailer.ts e-posta göndermek
  // yerine dev-modu davranışına (bağlantıyı API yanıtında döndürme) düşer.
  smtpHost: process.env.SMTP_HOST ?? null,
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? null,
  smtpPass: process.env.SMTP_PASS ?? null,
  mailFrom: process.env.MAIL_FROM ?? process.env.SMTP_USER ?? null,
};
