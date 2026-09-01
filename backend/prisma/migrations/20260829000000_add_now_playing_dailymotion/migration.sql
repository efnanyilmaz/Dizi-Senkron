-- Dailymotion desteği: gömme kapalı YouTube dışında ikinci bir embeddable kaynak.
ALTER TABLE "watch_groups" ADD COLUMN "now_playing_dailymotion_id" TEXT;
