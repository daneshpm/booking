"""
Database-free tests for the availability slot engine.
"""
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from pydantic import ValidationError
import pytest

from app.routers.bookings import (
    CreateBookingRequest,
    compute_staff_slots,
    parse_hhmm,
    prisma_day_of_week,
)

IST = ZoneInfo("Asia/Kolkata")
DAY = date(2026, 9, 15)  # Tuesday
FAR_PAST = datetime(2020, 1, 1, tzinfo=timezone.utc)  # so no slot is "in the past"


def _starts(slots):
    return [s.strftime("%H:%M") for s, _ in slots]


def test_parse_hhmm_and_day_of_week():
    assert parse_hhmm("09:30") == 570
    assert parse_hhmm("18:00") == 1080
    assert prisma_day_of_week(date(2026, 9, 13)) == 0  # Sunday
    assert prisma_day_of_week(date(2026, 9, 14)) == 1  # Monday
    assert prisma_day_of_week(date(2026, 9, 19)) == 6  # Saturday


def test_slots_respect_shift_and_lunch_break():
    slots = compute_staff_slots(
        booking_date=DAY,
        tz=IST,
        shift_start_minutes=parse_hhmm("09:30"),
        shift_end_minutes=parse_hhmm("12:30"),
        breaks=[(parse_hhmm("10:30"), parse_hhmm("11:00"))],
        busy=[],
        duration_minutes=30,
        now=FAR_PAST,
    )
    assert _starts(slots) == ["09:30", "10:00", "11:00", "11:30", "12:00"]
    # Every slot is expressed in the workspace timezone
    assert all(s.tzinfo is not None and s.utcoffset() == timedelta(hours=5, minutes=30) for s, _ in slots)


def test_buffers_pad_collisions_with_existing_bookings():
    booked_start = datetime(2026, 9, 15, 11, 0, tzinfo=IST)
    booked_end = datetime(2026, 9, 15, 11, 30, tzinfo=IST)
    slots = compute_staff_slots(
        booking_date=DAY,
        tz=IST,
        shift_start_minutes=parse_hhmm("09:00"),
        shift_end_minutes=parse_hhmm("13:00"),
        breaks=[],
        busy=[(booked_start, booked_end)],
        duration_minutes=30,
        buffer_before_minutes=10,
        buffer_after_minutes=15,
        now=FAR_PAST,
    )
    # 10:30 ends at 11:00 but its 15-min wrap buffer overlaps the booking;
    # 11:30 starts at 11:30 but its 10-min prep buffer overlaps the booking.
    assert _starts(slots) == ["09:00", "09:30", "10:00", "12:00", "12:30"]


def test_busy_intervals_in_other_timezones_are_compared_correctly():
    # 05:30Z == 11:00 IST
    busy = [(datetime(2026, 9, 15, 5, 30, tzinfo=timezone.utc), datetime(2026, 9, 15, 6, 0, tzinfo=timezone.utc))]
    slots = compute_staff_slots(
        booking_date=DAY,
        tz=IST,
        shift_start_minutes=parse_hhmm("10:00"),
        shift_end_minutes=parse_hhmm("12:00"),
        breaks=[],
        busy=busy,
        duration_minutes=30,
        now=FAR_PAST,
    )
    assert _starts(slots) == ["10:00", "10:30", "11:30"]


def test_past_slots_are_excluded():
    now = datetime(2026, 9, 15, 10, 25, tzinfo=IST)
    slots = compute_staff_slots(
        booking_date=DAY,
        tz=IST,
        shift_start_minutes=parse_hhmm("10:00"),
        shift_end_minutes=parse_hhmm("11:30"),
        breaks=[],
        busy=[],
        duration_minutes=30,
        now=now,
    )
    # 10:00 is past; 10:30 is within the 10-minute lead time; 11:00 is offered.
    assert _starts(slots) == ["11:00"]


def test_step_defaults_to_duration_when_shorter_than_30():
    slots = compute_staff_slots(
        booking_date=DAY,
        tz=IST,
        shift_start_minutes=parse_hhmm("09:00"),
        shift_end_minutes=parse_hhmm("10:00"),
        breaks=[],
        busy=[],
        duration_minutes=15,
        now=FAR_PAST,
    )
    assert _starts(slots) == ["09:00", "09:15", "09:30", "09:45"]


def _payload(**overrides):
    base = {
        "workspaceSlug": "rooman-technologies",
        "serviceSlug": "career-guidance",
        "startTime": "2026-10-20T10:00:00+00:00",
        "endTime": "2026-10-20T10:30:00+00:00",
        "customerName": "Ravi Shankar",
        "customerEmail": "ravi@example.com",
    }
    base.update(overrides)
    return base


def test_booking_request_rejects_naive_datetimes():
    with pytest.raises(ValidationError):
        CreateBookingRequest(**_payload(startTime="2026-10-20T10:00:00", endTime="2026-10-20T10:30:00"))


def test_booking_request_rejects_inverted_interval():
    with pytest.raises(ValidationError):
        CreateBookingRequest(**_payload(startTime="2026-10-20T10:30:00Z", endTime="2026-10-20T10:00:00Z"))


def test_booking_request_accepts_aware_interval():
    req = CreateBookingRequest(**_payload())
    assert req.startTime.tzinfo is not None
    assert req.endTime > req.startTime
