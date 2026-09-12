-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'REFUNDED', 'FAILED');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PAID',
ADD COLUMN     "payment_provider" TEXT,
ADD COLUMN     "payment_order_id" TEXT,
ADD COLUMN     "payment_transaction_id" TEXT,
ADD COLUMN     "payment_currency" TEXT,
ADD COLUMN     "paid_at" TIMESTAMPTZ;
