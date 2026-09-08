-- Double-booking prevention enforced by the database itself.
--
-- Application-level "check then insert" logic cannot prevent two concurrent
-- requests from both passing the check and both inserting. An exclusion
-- constraint makes overlapping appointments for the same staff member
-- physically impossible regardless of concurrency or which client wrote them.
--
-- btree_gist lets a GiST index mix the equality operator on staff_id with the
-- overlap operator on the time range.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_no_staff_overlap"
  EXCLUDE USING gist (
    "staff_id" WITH =,
    tstzrange("start_time", "end_time", '[)') WITH &&
  )
  WHERE ("status" <> 'CANCELLED');

-- Guarantee every appointment has positive duration.
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_end_after_start" CHECK ("end_time" > "start_time");
