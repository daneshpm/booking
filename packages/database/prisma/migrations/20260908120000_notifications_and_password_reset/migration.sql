-- Password reset tokens.
--
-- Only the SHA-256 digest of the token is stored, matching how sessions work,
-- so a dump of this table cannot be used to take over accounts.
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Exactly-once delivery for scheduled workflow notifications.
--
-- A worker claims a reminder by inserting its log row before sending. This
-- unique index makes that claim atomic, so two workers running at the same time
-- cannot both send the same reminder to the same recipient.
--
-- workflow_id is NULL for the built-in transactional mail sent on booking and
-- cancellation. PostgreSQL treats NULLs as distinct in a unique index, so those
-- rows stay unconstrained and can legitimately repeat.
CREATE UNIQUE INDEX "notification_logs_workflow_id_booking_id_recipient_key" ON "notification_logs"("workflow_id", "booking_id", "recipient");

-- Supports the worker's sweep for pending and failed deliveries.
CREATE INDEX "notification_logs_status_createdAt_idx" ON "notification_logs"("status", "createdAt");
