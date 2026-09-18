-- bookings_no_staff_overlap exempts group-service rows (is_group_booking)
-- entirely, so that two customers can legitimately share one staff member's
-- slot in the same group class. That exemption has a gap: it also allows a
-- group booking to silently coexist with an ordinary (or a different group
-- service's) booking for the SAME staff member at an OVERLAPPING time, since
-- neither row is compared against the other by that constraint at all.
--
-- This second, independent constraint closes that gap without reopening the
-- one the first constraint exists for: it excludes two overlapping rows for
-- the same staff member only when their service_id DIFFERS. Two customers of
-- the same group class (same staff, same service, overlapping time) are
-- untouched by it; a group class and an unrelated one-on-one (or a different
-- group service) for that same staff member at an overlapping time are not.
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_no_cross_service_staff_overlap"
  EXCLUDE USING gist (
    "staff_id" WITH =,
    "service_id" WITH <>,
    tstzrange("start_time", "end_time", '[)') WITH &&
  )
  WHERE ("status" <> 'CANCELLED');
