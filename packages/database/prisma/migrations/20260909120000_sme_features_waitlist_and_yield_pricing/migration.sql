-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'NOTIFIED', 'CLAIMED', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "discount_applied" INTEGER DEFAULT 0,
ADD COLUMN     "discount_label" TEXT,
ADD COLUMN     "paid_price" DECIMAL(10,2),
ADD COLUMN     "source" TEXT DEFAULT 'ONLINE';

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "has_yield_pricing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "yield_days" TEXT,
ADD COLUMN     "yield_discount_percent" INTEGER DEFAULT 0,
ADD COLUMN     "yield_end_time" TEXT,
ADD COLUMN     "yield_label" TEXT DEFAULT 'Off-Peak Special',
ADD COLUMN     "yield_start_time" TEXT;

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "staff_id" TEXT,
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "customer_phone" TEXT,
    "preferred_date" DATE NOT NULL,
    "notes" TEXT,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "claim_token" TEXT,
    "notified_at" TIMESTAMPTZ,
    "claimed_booking_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_claim_token_key" ON "waitlist_entries"("claim_token");

-- CreateIndex
CREATE INDEX "waitlist_entries_workspace_id_service_id_preferred_date_sta_idx" ON "waitlist_entries"("workspace_id", "service_id", "preferred_date", "status");

-- CreateIndex
CREATE INDEX "waitlist_entries_claim_token_idx" ON "waitlist_entries"("claim_token");

-- CreateIndex
CREATE INDEX "bookings_workspace_id_source_idx" ON "bookings"("workspace_id", "source");

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
