-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('TRIAL', 'SUBSCRIBED');

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "billing_status" "BillingStatus" NOT NULL DEFAULT 'TRIAL',
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "trial_ends_at" TIMESTAMPTZ;
