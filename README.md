# Dizi Senkron

**Dizi Senkron** is a real-time watch-party app for groups of friends tracking a TV show together — see who's caught up, chat without spoilers, and watch YouTube episodes in sync.

Built as a full-stack portfolio project, focused on Turkish-language TV dramas.

## Features

- **Groups & invites** — create a group around a show, invite friends with a short code or make the group publicly discoverable; a group's owner can promote members to moderator, who can then kick members and moderate chat
- **Progress tracking** — everyone's season/episode is visible at a glance; segments scale to the show's real per-season episode count (pulled from TMDB), not a fixed guess; a banner surfaces the next episode's real air date when the show is still airing
- **Spoiler-aware chat** — real-time group chat (Socket.io) scoped to each group; messages from ahead of your own progress render blurred until you choose to reveal them (see [How it works](#how-it-works) below); react with emoji, edit or delete your own messages, and flag one for moderator review if it breaks the group's rules
- **Watch together** — search for an episode by name (auto-scoped to the show's official YouTube channel, filtered to full-length episodes only — no trailers, clips, or unrelated results) and watch in sync: play/pause/seek propagate to everyone live. Falls back to Dailymotion search, or a manual "share your position" mode, for episodes YouTube won't let the app embed
- **Group polls** — vote on what to watch next; the group owner or a moderator can apply the winning result directly, switching the whole group's show and resetting everyone's progress
- **Discover catalog** — browse, filter by genre, and search a curated feed of Turkish TV dramas (restricted to shows actually aired on a real broadcast channel — no digital-only or foreign-language false positives)
- **Contact form** — a public `/iletisim` page for feedback/bug reports, stored server-side (or emailed, once [SMTP is configured](#email-delivery))
- **Auth** — email/password with JWT in an httpOnly cookie, bcrypt-hashed passwords, email verification, self-service password/email change, password reset, and account deletion (see [Email delivery](#email-delivery) below)

## Tech stack

**Frontend** — Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Framer Motion · Socket.io-client

**Backend** — Express 4 · Socket.io · Prisma ORM · PostgreSQL · Zod validation · JWT auth

**External APIs** — [TMDB](https://www.themoviedb.org/documentation/api) (show data), [YouTube Data API v3](https://developers.google.com/youtube/v3) (episode search & validation), [Dailymotion](https://www.dailymotion.com/) (fallback search/embed when YouTube won't embed an episode)

**Testing** — Vitest (unit tests for the parsing/validation logic on both ends)

## Getting started

No Docker — the database is [Neon](https://neon.tech) (managed Postgres) in every environment, local dev included. Needs Node.js 20+.

### Prerequisites

- A free [Neon](https://neon.tech) project — grab the connection string from its dashboard. Two branches are recommended (Neon branches a database the way git branches a repo): `main` for production, a separate `dev` branch for local work, so testing locally can never touch real data. Each branch has its own connection string.
- A [TMDB API key](https://www.themoviedb.org/settings/api) (free)
- Optionally, a [YouTube Data API v3 key](https://console.cloud.google.com) (enables the episode-search feature)

### Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in DATABASE_URL (your Neon dev branch), JWT_SECRET, TMDB_API_KEY
npx prisma migrate deploy
npm run dev
```

Runs on `http://localhost:4000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:3000`.

## Testing & CI

```bash
cd backend && npm run typecheck && npm test
cd frontend && npm run typecheck && npm run lint && npm test
```

The same commands run on every push/PR via [GitHub Actions](.github/workflows/ci.yml).

## How it works

A few of the harder problems this project actually had to solve, not just wire up:

**Spoiler-aware chat.** Each message stores the sender's season/episode at the moment they sent it. There's no global "spoiler cutoff" — instead, every message is compared against *the viewer's own* progress at render time: if the sender was ahead of you when they wrote it, the message renders blurred, with a one-way reveal ("you can't un-see it"). Two people in the same group, at different episodes, see a completely different chat — which is the whole point of the app, so this comparison had to be correct, not approximate.

**Real-time sync, with a fallback for content that can't sync.** Watch-together state (which video, play/pause, current time) broadcasts over a Socket.io room per group. The interesting part came from testing it against real Turkish broadcaster content: a good number of official episode uploads have YouTube embedding disabled by the rights holder, which makes true synced playback impossible for those — not a bug to route around, but a real content restriction. Rather than pretending it works, the app detects non-embeddable video, then either falls back to a search against Dailymotion (where the uploader has explicitly allowed embedding) or, if no embeddable copy exists anywhere, switches the group into a "watch on the original site, manually share your timestamp" mode instead of silently breaking.

**Show data heals itself.** Early on, a client-side testing shortcut wrote a `Show` record with a null poster/backdrop, and because every endpoint that touches a `Show` only filled in those fields on *creation*, that one bad record stayed broken indefinitely and silently degraded a real user's group page. The fix wasn't a one-off patch — every code path that creates or touches a `Show` record (favoriting, marking watch status, creating a group, applying a poll result) now re-derives poster/backdrop/rating from TMDB on every touch, so a single bad write can't persist. A shared `upsertShowFromTmdb` helper enforces this instead of trusting whatever the client happened to send.

**Email change can't be used to silently take over an account.** Changing your email requires your current password up front, and the confirmation link is only ever sent to the *new* address — the address on the account doesn't actually change until whoever controls that inbox clicks it. An attacker with a stolen session can request the change, but can't complete it without also owning the new mailbox.

## Email delivery

Email verification and password reset send through SMTP (`backend/src/lib/mailer.ts` — see `.env.example` for setup; a Gmail App Password works for testing, any SMTP provider works for production) when `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` are set. Left unset (the default for local dev), `POST /auth/forgot-password` and the email-verification endpoints fall back to returning the link directly in the API response instead of emailing it, and the frontend surfaces it inline with a "test mode" label — so the whole auth flow is testable without setting up an email account.

## Project structure

```
backend/
  src/
    routes/        REST endpoints (auth, groups, shows, messages, favorites, youtube)
    socket/        Socket.io event handlers (chat, progress, watch-together sync)
    lib/           TMDB/YouTube/Dailymotion clients, auth helpers, mailer
    middleware/    auth guard, rate limiting
    prisma/        schema.prisma — User, Show, WatchGroup, GroupMember, Message, MessageReport, MessageReaction, Favorite, Poll, ContactMessage

frontend/
  src/
    app/           Next.js App Router pages
    components/    UI components
    lib/           API client, socket client, small utilities
```

## Notes

This is a portfolio/learning project, not a production service — TMDB/YouTube keys are required for show data and episode search to work, and there's no deployed instance by default.

## Author

Built by Efnan Yılmaz — [GitHub](https://github.com/efnanyilmaz) · [LinkedIn](https://linkedin.com/in/efnanyilmaz)
