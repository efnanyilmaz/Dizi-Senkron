-- CreateTable
CREATE TABLE "message_reports" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "message_reports_message_id_reporter_id_key" ON "message_reports"("message_id", "reporter_id");

-- AddForeignKey
ALTER TABLE "message_reports" ADD CONSTRAINT "message_reports_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reports" ADD CONSTRAINT "message_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
