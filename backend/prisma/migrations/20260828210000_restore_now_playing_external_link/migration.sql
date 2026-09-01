-- Harici link modu geri getirildi.
ALTER TABLE "watch_groups" ADD COLUMN "now_playing_embeddable" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "watch_groups" ADD COLUMN "now_playing_external_url" TEXT;
