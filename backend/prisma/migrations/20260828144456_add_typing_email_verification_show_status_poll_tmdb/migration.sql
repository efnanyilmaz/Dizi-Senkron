-- AlterTable
ALTER TABLE "poll_options" ADD COLUMN     "poster_path" TEXT,
ADD COLUMN     "tmdb_id" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_verified_at" TIMESTAMP(3),
ADD COLUMN     "verify_token_expires_at" TIMESTAMP(3),
ADD COLUMN     "verify_token_hash" TEXT;

-- CreateTable
CREATE TABLE "show_statuses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "show_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "show_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "show_statuses_user_id_show_id_key" ON "show_statuses"("user_id", "show_id");

-- AddForeignKey
ALTER TABLE "show_statuses" ADD CONSTRAINT "show_statuses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "show_statuses" ADD CONSTRAINT "show_statuses_show_id_fkey" FOREIGN KEY ("show_id") REFERENCES "shows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
