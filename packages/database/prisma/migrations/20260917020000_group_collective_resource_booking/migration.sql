-- CreateEnum
CREATE TYPE "StaffKind" AS ENUM ('PERSON', 'RESOURCE');

-- AlterTable
ALTER TABLE "staff" ADD COLUMN     "kind" "StaffKind" NOT NULL DEFAULT 'PERSON';

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "capacity" INTEGER;

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "is_group_booking" BOOLEAN NOT NULL DEFAULT false;

-- Group bookings (Service.capacity > 1) legitimately share one staff member's
-- slot across several customers, which is exactly what this constraint
-- otherwise prevents, so those rows are exempted from it. Application code
-- (createPublicBookingAction) enforces the capacity limit itself instead, via
-- an advisory-lock-guarded count-then-insert.
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_no_staff_overlap";

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_no_staff_overlap"
  EXCLUDE USING gist (
    "staff_id" WITH =,
    tstzrange("start_time", "end_time", '[)') WITH &&
  )
  WHERE ("status" <> 'CANCELLED' AND NOT "is_group_booking");

-- CreateTable
CREATE TABLE "booking_participants" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "start_time" TIMESTAMPTZ NOT NULL,
    "end_time" TIMESTAMPTZ NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',

    CONSTRAINT "booking_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "booking_participants_booking_id_staff_id_key" ON "booking_participants"("booking_id", "staff_id");

-- CreateIndex
CREATE INDEX "booking_participants_staff_id_start_time_end_time_idx" ON "booking_participants"("staff_id", "start_time", "end_time");

-- AddForeignKey
ALTER TABLE "booking_participants" ADD CONSTRAINT "booking_participants_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_participants" ADD CONSTRAINT "booking_participants_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Double-booking prevention for collective-booking participants, same
-- mechanism and reasoning as bookings_no_staff_overlap.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "booking_participants"
  ADD CONSTRAINT "booking_participants_no_staff_overlap"
  EXCLUDE USING gist (
    "staff_id" WITH =,
    tstzrange("start_time", "end_time", '[)') WITH &&
  )
  WHERE ("status" <> 'CANCELLED');
