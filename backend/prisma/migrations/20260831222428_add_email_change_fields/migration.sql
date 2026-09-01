-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_change_token_expires_at" TIMESTAMP(3),
ADD COLUMN     "email_change_token_hash" TEXT,
ADD COLUMN     "pending_email" TEXT;
