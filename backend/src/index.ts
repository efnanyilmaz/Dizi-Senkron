import { createServer } from "node:http";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import "express-async-errors";
import { env } from "./lib/env.js";
import { authRouter } from "./routes/auth.js";
import { showsRouter } from "./routes/shows.js";
import { groupsRouter } from "./routes/groups.js";
import { messagesRouter } from "./routes/messages.js";
import { pollsRouter } from "./routes/polls.js";
import { favoritesRouter } from "./routes/favorites.js";
import { showStatusRouter } from "./routes/show-status.js";
import { youtubeRouter } from "./routes/youtube.js";
import { dailymotionRouter } from "./routes/dailymotion.js";
import { contactRouter } from "./routes/contact.js";
import { createSocketServer } from "./socket/index.js";
import { apiLimiter, youtubeLimiter, authLimiter } from "./middleware/rate-limit.js";

const app = express();

app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api", apiLimiter);

app.use("/api/auth", authRouter);
app.use("/api/shows", showsRouter);
app.use("/api/groups", groupsRouter);
app.use("/api/groups", messagesRouter);
app.use("/api/groups", pollsRouter);
app.use("/api/favorites", favoritesRouter);
app.use("/api/show-status", showStatusRouter);
app.use("/api/youtube", youtubeLimiter, youtubeRouter);
app.use("/api/dailymotion", youtubeLimiter, dailymotionRouter);
app.use("/api/contact", authLimiter, contactRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Sunucuda bir şeyler ters gitti." });
});

const httpServer = createServer(app);
createSocketServer(httpServer);

httpServer.listen(env.port, () => {
  console.log(`Dizi Senkron API http://localhost:${env.port} adresinde çalışıyor`);
});
