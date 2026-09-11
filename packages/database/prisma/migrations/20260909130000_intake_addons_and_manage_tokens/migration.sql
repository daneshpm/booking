-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "intake_responses" JSONB,
ADD COLUMN     "manage_token" TEXT,
ADD COLUMN     "selected_addons" JSONB;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "addons" JSONB,
ADD COLUMN     "intake_questions" JSONB,
ADD COLUMN     "routing_strategy" TEXT DEFAULT 'ANY_AVAILABLE';

-- CreateIndex
CREATE UNIQUE INDEX "bookings_manage_token_key" ON "bookings"("manage_token");

-- CreateIndex
CREATE INDEX "bookings_manage_token_idx" ON "bookings"("manage_token");
