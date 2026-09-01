-- Harici link modu geri alındı: bu iki alan artık kullanılmıyor.
ALTER TABLE "watch_groups" DROP COLUMN "now_playing_embeddable";
ALTER TABLE "watch_groups" DROP COLUMN "now_playing_external_url";
