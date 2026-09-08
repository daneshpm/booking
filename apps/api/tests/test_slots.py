"""
Database-free tests for the availability engine.

These mirror packages/core/test/scheduling.spec.ts. The two engines serve the
same booking flow, so where they disagree a customer is offered a slot that the
other half of the system will refuse.
"""

from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest
from pydantic import ValidationError

from app.routers.bookings import (
    CreateBookingRequest,
    compute_slots,
    local_time_to_utc,
    minutes_to_hhmm,
    parse_hhmm,
    prisma_day_of_week,
    resolve_working_window,
)

IST = ZoneInfo("Asia/Kolkata")
NY = ZoneInfo("America/New_York")
DAY = date(2026, 9, 15)  # a Tuesday
LONG_AGO = datetime(2020, 1, 1, tzinfo=timezone.utc)


class FakeBreak:
    def __init__(self, start: str, end: str):
        self.start_time = start
        self.end_time = end


class FakeWeekly:
    def __init__(self, start: str, end: str, breaks=()):
        self.start_time = start
        self.end_time = end
        self.breaks = list(breaks)


class FakeOverride:
    def __init__(self, is_working: bool, start=None, end=None):
        self.is_working = is_working
        self.start_time = start
        self.end_time = end


def local_times(slots):
    return [local for _start, _end, local in slots]


def window(start="09:00", end="17:00", breaks=()):
    return (start, end, list(breaks))


# ----------------------------------------------------
# Helpers
# ----------------------------------------------------


def test_parse_and_format_round_trip():
    assert parse_hhmm("09:30") == 570
    assert parse_hhmm("18:00") == 1080
    assert minutes_to_hhmm(570) == "09:30"
    assert minutes_to_hhmm(0) == "00:00"


def test_day_of_week_matches_the_schema_convention():
    assert prisma_day_of_week(date(2026, 9, 13)) == 0  # Sunday
    assert prisma_day_of_week(date(2026, 9, 14)) == 1  # Monday
    assert prisma_day_of_week(date(2026, 9, 19)) == 6  # Saturday


def test_local_time_to_utc_applies_the_offset():
    assert local_time_to_utc(DAY, parse_hhmm("09:30"), IST).isoformat() == "2026-09-15T04:00:00+00:00"


def test_local_time_to_utc_returns_none_for_a_skipped_hour():
    # New York jumps 02:00 to 03:00 on 8 March 2026, so 02:30 never happens.
    assert local_time_to_utc(date(2026, 3, 8), parse_hhmm("02:30"), NY) is None


# ----------------------------------------------------
# Working window resolution
# ----------------------------------------------------


def test_window_uses_the_weekly_schedule_without_an_override():
    weekly = FakeWeekly("09:00", "17:00", [FakeBreak("13:00", "14:00")])
    assert resolve_working_window(weekly, None) == ("09:00", "17:00", [("13:00", "14:00")])


def test_window_is_none_on_a_non_working_day():
    assert resolve_working_window(None, None) is None


def test_leave_override_blocks_the_day():
    weekly = FakeWeekly("09:00", "17:00")
    assert resolve_working_window(weekly, FakeOverride(False)) is None
    # Even when the leave row happens to carry times.
    assert resolve_working_window(weekly, FakeOverride(False, "10:00", "14:00")) is None


def test_special_shift_replaces_hours_and_breaks():
    weekly = FakeWeekly("09:00", "17:00", [FakeBreak("13:00", "14:00")])
    assert resolve_working_window(weekly, FakeOverride(True, "10:00", "14:00")) == (
        "10:00",
        "14:00",
        [],
    )


def test_working_override_without_hours_falls_back_to_the_weekly_shift():
    # "Working today, normal hours" must not produce an empty day.
    weekly = FakeWeekly("09:00", "17:00", [FakeBreak("13:00", "14:00")])
    assert resolve_working_window(weekly, FakeOverride(True)) == (
        "09:00",
        "17:00",
        [("13:00", "14:00")],
    )


def test_working_override_without_hours_or_weekly_shift_is_none():
    assert resolve_working_window(None, FakeOverride(True)) is None


# ----------------------------------------------------
# Slot generation
# ----------------------------------------------------


def test_slots_fill_the_shift_at_the_default_step():
    slots = compute_slots(
        booking_date=DAY,
        tz=IST,
        window=window("09:00", "11:00"),
        busy=[],
        duration_minutes=30,
        now=LONG_AGO,
    )
    assert local_times(slots) == ["09:00", "09:30", "10:00", "10:30"]


def test_slots_never_run_past_the_end_of_the_shift():
    slots = compute_slots(
        booking_date=DAY,
        tz=IST,
        window=window("09:00", "10:00"),
        busy=[],
        duration_minutes=45,
        now=LONG_AGO,
    )
    assert local_times(slots) == ["09:00"]


def test_step_falls_back_to_the_duration_when_shorter_than_30():
    slots = compute_slots(
        booking_date=DAY,
        tz=IST,
        window=window("09:00", "10:00"),
        busy=[],
        duration_minutes=15,
        now=LONG_AGO,
    )
    assert local_times(slots) == ["09:00", "09:15", "09:30", "09:45"]


def test_breaks_are_excluded():
    slots = compute_slots(
        booking_date=DAY,
        tz=IST,
        window=window("12:00", "15:00", [("13:00", "14:00")]),
        busy=[],
        duration_minutes=30,
        now=LONG_AGO,
    )
    assert local_times(slots) == ["12:00", "12:30", "14:00", "14:30"]


def test_buffers_pad_the_slot_before_collision_checks():
    booked = local_time_to_utc(DAY, parse_hhmm("11:00"), IST)
    slots = compute_slots(
        booking_date=DAY,
        tz=IST,
        window=window("09:00", "13:00"),
        busy=[(booked, booked + timedelta(minutes=30))],
        duration_minutes=30,
        buffer_before_minutes=10,
        buffer_after_minutes=15,
        now=LONG_AGO,
    )
    assert local_times(slots) == ["09:00", "09:30", "10:00", "12:00", "12:30"]


def test_a_slot_may_begin_exactly_when_a_booking_ends():
    booked = local_time_to_utc(DAY, parse_hhmm("09:00"), IST)
    slots = compute_slots(
        booking_date=DAY,
        tz=IST,
        window=window("09:00", "11:00"),
        busy=[(booked, booked + timedelta(minutes=30))],
        duration_minutes=30,
        now=LONG_AGO,
    )
    assert local_times(slots) == ["09:30", "10:00", "10:30"]


def test_a_booking_crossing_midnight_is_detected():
    # Minute-of-day arithmetic inverts this interval and misses it, offering a
    # slot the database then refuses.
    busy = [
        (
            datetime(2026, 9, 14, 18, 0, tzinfo=timezone.utc),  # 23:30 IST on the 14th
            datetime(2026, 9, 14, 19, 0, tzinfo=timezone.utc),  # 00:30 IST on the 15th
        )
    ]
    slots = compute_slots(
        booking_date=DAY,
        tz=IST,
        window=window("00:00", "02:00"),
        busy=busy,
        duration_minutes=30,
        now=LONG_AGO,
    )
    assert "00:00" not in local_times(slots)
    assert "01:00" in local_times(slots)


def test_past_slots_and_the_lead_time_are_excluded():
    now = local_time_to_utc(DAY, parse_hhmm("09:55"), IST)
    slots = compute_slots(
        booking_date=DAY,
        tz=IST,
        window=window("09:00", "11:00"),
        busy=[],
        duration_minutes=30,
        now=now,
    )
    # 09:00 and 09:30 have gone; 10:00 falls inside the ten-minute lead time.
    assert local_times(slots) == ["10:30"]


def test_an_inverted_shift_yields_nothing():
    slots = compute_slots(
        booking_date=DAY,
        tz=IST,
        window=window("17:00", "09:00"),
        busy=[],
        duration_minutes=30,
        now=LONG_AGO,
    )
    assert slots == []


def test_a_non_positive_duration_yields_nothing():
    slots = compute_slots(
        booking_date=DAY,
        tz=IST,
        window=window(),
        busy=[],
        duration_minutes=0,
        now=LONG_AGO,
    )
    assert slots == []


# ----------------------------------------------------
# Daylight saving
# ----------------------------------------------------


def test_the_hour_skipped_by_spring_forward_is_omitted():
    slots = compute_slots(
        booking_date=date(2026, 3, 8),
        tz=NY,
        window=window("01:00", "04:00"),
        busy=[],
        duration_minutes=60,
        step_minutes=60,
        now=LONG_AGO,
    )
    assert local_times(slots) == ["01:00", "03:00"]


def test_no_two_slots_resolve_to_the_same_instant():
    for day in (date(2026, 3, 8), date(2026, 11, 1)):
        slots = compute_slots(
            booking_date=day,
            tz=NY,
            window=window("00:00", "06:00"),
            busy=[],
            duration_minutes=30,
            now=LONG_AGO,
        )
        starts = [start for start, _end, _local in slots]
        assert len(set(starts)) == len(starts)


# ----------------------------------------------------
# Request validation
# ----------------------------------------------------


def _payload(**overrides):
    base = {
        "workspaceSlug": "acme",
        "serviceSlug": "consult",
        "startTime": "2026-10-20T10:00:00+00:00",
        "customerName": "Ravi Shankar",
        "customerEmail": "ravi@example.com",
    }
    base.update(overrides)
    return base


def test_booking_request_rejects_a_naive_start_time():
    with pytest.raises(ValidationError):
        CreateBookingRequest(**_payload(startTime="2026-10-20T10:00:00"))


def test_booking_request_accepts_an_aware_start_time():
    req = CreateBookingRequest(**_payload())
    assert req.startTime.tzinfo is not None


def test_booking_request_does_not_accept_a_client_supplied_end_time():
    """
    The appointment length comes from the service, so a caller cannot ask for a
    twelve-hour slot on a fifteen-minute service.
    """
    req = CreateBookingRequest(**_payload(endTime="2026-10-20T22:00:00+00:00"))
    assert not hasattr(req, "endTime")
