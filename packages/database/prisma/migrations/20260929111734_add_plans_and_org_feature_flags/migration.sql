-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "analytics_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "booking_pages_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "data_export_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "workflows_enabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "billing_period" "BillingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "features" TEXT[],
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plans_display_order_idx" ON "plans"("display_order");
