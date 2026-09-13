import uuid
from datetime import datetime, date, timedelta, timezone
from typing import List, Optional, Sequence, Tuple
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, EmailStr, Field, model_validator
from sqlalchemy import and_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models import (
    Booking,
    Customer,
    Service,
    ServiceStaff,
    Staff,
    StaffOverride,
    StaffWorkingHours,
    Workspace,
)
from app.rate_limit import check_rate_limit, caller_address, PUBLIC_BOOKING_LIMIT

router = APIRouter(prefix="", tags=["Services & Bookings"])

# Slots must start at least this far in the future to be offered. Matches
# DEFAULT_LEAD_MINUTES in packages/core/src/scheduling.
MIN_LEAD_TIME = timedelta(minutes=10)
DEFAULT_SLOT_STEP_MINUTES = 30

# SQLSTATE for exclusion_violation, raised by the bookings_no_staff_overlap
# constraint when two appointments would overlap for one staff member.
EXCLUSION_VIOLATION = "23P01"


# ----------------------------------------------------
# Schemas
# ----------------------------------------------------


class ServiceDTO(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    durationMinutes: int
    bufferBeforeMinutes: int
    bufferAfterMinutes: int
    price: float
    currency: str
    locationType: str
    locationDetails: Optional[str] = None


class AvailabilitySlot(BaseModel):
    startTime: str  # ISO 8601 in the requested display timezone
    endTime: str
    displayTime: str
    available: bool = True
    staffId: Optional[str] = None
    staffName: Optional[str] = None


class AvailabilityResponse(BaseModel):
    date: str
    timezone: str
    slots: List[AvailabilitySlot]


class CreateBookingRequest(BaseModel):
    workspaceSlug: str = Field(..., description="Workspace slug")
    serviceSlug: str = Field(..., description="Service slug")
    staffId: Optional[str] = None
    startTime: datetime = Field(..., description="Booking start (ISO 8601 with timezone)")
    customerName: str = Field(..., min_length=1, max_length=200)
    customerEmail: EmailStr
    customerPhone: Optional[str] = Field(None, max_length=50)
    customerTimezone: str = "Asia/Kolkata"
    notes: Optional[str] = Field(None, max_length=2000)
    idempotencyKey: Optional[str] = Field(None, max_length=200)

    @model_validator(mode="after")
    def _validate_customer_timezone(self) -> "CreateBookingRequest":
        """
        Reject a timezone the formatter cannot resolve.

        The value is stored on the booking and later used to render every
        notification for it. An unresolvable name throws at render time, which
        would take down the whole reminder sweep rather than just this booking.
        """
        try:
            ZoneInfo(self.customerTimezone)
        except Exception:
            raise ValueError(
                "customerTimezone must be a valid IANA timezone, for example Asia/Kolkata"
            )
        return self

    @model_validator(mode="after")
    def _require_aware_start(self) -> "CreateBookingRequest":
        # asyncpg cannot compare a naive datetime against a timestamptz column,
        # so this is rejected as a 422 rather than failing deep in the query.
        if self.startTime.tzinfo is None:
            raise ValueError(
                "startTime must include a timezone offset, for example 2026-10-20T10:00:00Z"
            )
        return self


class BookingConfirmation(BaseModel):
    id: str
    status: str
    serviceName: str
    staffName: str
    startTime: str
    endTime: str
    customerName: str
    customerEmail: str
    meetingLink: Optional[str] = None
    message: str = "Appointment successfully confirmed"


# ----------------------------------------------------
# Pure helpers, mirroring packages/core/src/scheduling
# ----------------------------------------------------


def parse_hhmm(value: str) -> int:
    """Convert an "HH:MM" string to minutes since midnight."""
    hours, minutes = value.split(":")
    return int(hours) * 60 + int(minutes)


def minutes_to_hhmm(value: int) -> str:
    return f"{value // 60:02d}:{value % 60:02d}"


def prisma_day_of_week(day: date) -> int:
    """Python weekday() is Mon=0..Sun=6; the schema stores Sun=0..Sat=6."""
    return (day.weekday() + 1) % 7


def local_time_to_utc(day: date, minutes: int, tz: ZoneInfo) -> Optional[datetime]:
    """
    Resolve a local wall-clock time to an absolute instant.

    Returns None when that local time does not exist, which happens for the hour
    a spring-forward transition skips. Without the check the value silently
    lands an hour away from the label the customer chose.
    """
    naive = datetime.combine(day, datetime.min.time()) + timedelta(minutes=minutes)
    localised = naive.replace(tzinfo=tz)
    absolute = localised.astimezone(timezone.utc)

    # Round-trip: a skipped local time renders back as a different wall clock.
    if absolute.astimezone(tz).strftime("%H:%M") != minutes_to_hhmm(minutes):
        return None
    return absolute


def resolve_working_window(
    weekly: Optional[StaffWorkingHours], override: Optional[StaffOverride]
) -> Optional[Tuple[str, str, List[Tuple[str, str]]]]:
    """
    Decide which hours apply on a date: (start, end, breaks).

    An override wins over the weekly schedule. Non-working means leave. A
    working override with no hours of its own falls back to the weekly shift,
    which is what "working today, normal hours" should mean.
    """
    if override is not None:
        if not override.is_working:
            return None
        if override.start_time and override.end_time:
            # A deliberately different shift replaces the normal one, breaks included.
            return (override.start_time, override.end_time, [])
        if weekly is None:
            return None
        return (
            weekly.start_time,
            weekly.end_time,
            [(b.start_time, b.end_time) for b in weekly.breaks],
        )

    if weekly is None:
        return None
    return (
        weekly.start_time,
        weekly.end_time,
        [(b.start_time, b.end_time) for b in weekly.breaks],
    )


def _overlaps(a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime) -> bool:
    # Half-open, matching the database exclusion constraint: touching endpoints
    # do not collide, so back-to-back appointments are allowed.
    return a_start < b_end and a_end > b_start


def compute_slots(
    *,
    booking_date: date,
    tz: ZoneInfo,
    window: Tuple[str, str, List[Tuple[str, str]]],
    busy: Sequence[Tuple[datetime, datetime]],
    duration_minutes: int,
    buffer_before_minutes: int = 0,
    buffer_after_minutes: int = 0,
    step_minutes: Optional[int] = None,
    now: Optional[datetime] = None,
) -> List[Tuple[datetime, datetime, str]]:
    """
    Generate bookable (start, end, local "HH:MM") tuples for one staff member.

    Works in absolute instants throughout. Minute-of-day arithmetic silently
    misses appointments that cross midnight and breaks on daylight-saving days,
    where a local day is not 1440 minutes long.
    """
    start_str, end_str, breaks = window
    if duration_minutes <= 0:
        return []

    step = step_minutes or min(DEFAULT_SLOT_STEP_MINUTES, duration_minutes)
    if step <= 0:
        return []

    shift_start = parse_hhmm(start_str)
    shift_end = parse_hhmm(end_str)
    if shift_end <= shift_start:
        return []

    now = now or datetime.now(timezone.utc)
    earliest = now + MIN_LEAD_TIME

    break_ranges: List[Tuple[datetime, datetime]] = []
    for b_start, b_end in breaks:
        start = local_time_to_utc(booking_date, parse_hhmm(b_start), tz)
        end = local_time_to_utc(booking_date, parse_hhmm(b_end), tz)
        if start and end and end > start:
            break_ranges.append((start, end))

    slots: List[Tuple[datetime, datetime, str]] = []
    seen: set = set()

    minute = shift_start
    while minute + duration_minutes <= shift_end:
        slot_start = local_time_to_utc(booking_date, minute, tz)
        if slot_start is None or slot_start in seen:
            minute += step
            continue

        slot_end = slot_start + timedelta(minutes=duration_minutes)
        padded_start = slot_start - timedelta(minutes=buffer_before_minutes)
        padded_end = slot_end + timedelta(minutes=buffer_after_minutes)

        collides = any(
            _overlaps(padded_start, padded_end, s, e) for s, e in break_ranges
        ) or any(_overlaps(padded_start, padded_end, s, e) for s, e in busy)

        if not collides and slot_start > earliest:
            seen.add(slot_start)
            slots.append((slot_start, slot_end, minutes_to_hhmm(minute)))

        minute += step

    slots.sort(key=lambda item: item[0])
    return slots


# ----------------------------------------------------
# Database helpers
# ----------------------------------------------------


def _safe_zone(name: Optional[str], fallback: str = "UTC") -> ZoneInfo:
    try:
        return ZoneInfo(name or fallback)
    except Exception:
        return ZoneInfo(fallback)


async def _get_workspace(db: AsyncSession, slug: str) -> Workspace:
    res = await db.execute(select(Workspace).where(Workspace.slug == slug))
    ws = res.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ws


async def _get_service(db: AsyncSession, ws: Workspace, slug: str) -> Service:
    res = await db.execute(
        select(Service).where(
            and_(Service.workspace_id == ws.id, Service.slug == slug, Service.is_active.is_(True))
        )
    )
    service = res.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service


async def _candidate_staff(
    db: AsyncSession, ws: Workspace, service: Service, staff_id: Optional[str] = None
) -> List[Staff]:
    """
    Staff who may deliver this service.

    Falls back to every active staff member when the service has no explicit
    assignments, because a newly created service has none and would otherwise be
    impossible to book.
    """
    assigned_res = await db.execute(
        select(ServiceStaff.staff_id).where(ServiceStaff.service_id == service.id)
    )
    assigned_ids = [row[0] for row in assigned_res.all()]

    query = select(Staff).where(
        and_(Staff.workspace_id == ws.id, Staff.is_active.is_(True))
    ).order_by(Staff.name.asc())

    if assigned_ids:
        query = query.where(Staff.id.in_(assigned_ids))
    if staff_id:
        query = query.where(Staff.id == staff_id)

    res = await db.execute(query)
    return list(res.scalars().all())


async def _schedule_for(
    db: AsyncSession, staff: Staff, booking_date: date, tz: ZoneInfo
) -> Optional[Tuple[Tuple[str, str, List[Tuple[str, str]]], List[Tuple[datetime, datetime]]]]:
    """Working window and existing appointments for one staff member on a date."""
    day_of_week = prisma_day_of_week(booking_date)

    hours_res = await db.execute(
        select(StaffWorkingHours)
        .options(selectinload(StaffWorkingHours.breaks))
        .where(
            and_(
                StaffWorkingHours.staff_id == staff.id,
                StaffWorkingHours.day_of_week == day_of_week,
            )
        )
    )
    weekly = hours_res.scalar_one_or_none()

    override_res = await db.execute(
        select(StaffOverride).where(
            and_(StaffOverride.staff_id == staff.id, StaffOverride.date == booking_date)
        )
    )
    override = override_res.scalar_one_or_none()

    window = resolve_working_window(weekly, override)
    if window is None:
        return None

    # Wider than the day, so an appointment that began the previous evening and
    # runs past midnight is still taken into account.
    day_start = datetime.combine(booking_date, datetime.min.time(), tzinfo=tz)
    bookings_res = await db.execute(
        select(Booking).where(
            and_(
                Booking.staff_id == staff.id,
                Booking.status != "CANCELLED",
                Booking.start_time < day_start + timedelta(days=2),
                Booking.end_time > day_start - timedelta(days=1),
            )
        )
    )
    busy = [(b.start_time, b.end_time) for b in bookings_res.scalars().all()]
    return window, busy


# ----------------------------------------------------
# Routes
# ----------------------------------------------------


@router.get("/services", response_model=List[ServiceDTO])
async def list_services(
    workspaceSlug: str = Query(..., description="Slug of the workspace"),
    db: AsyncSession = Depends(get_db),
):
    """List the active services of a workspace."""
    ws = await _get_workspace(db, workspaceSlug)

    services_res = await db.execute(
        select(Service)
        .where(and_(Service.workspace_id == ws.id, Service.is_active.is_(True)))
        .order_by(Service.createdAt.asc())
    )

    return [
        ServiceDTO(
            id=s.id,
            name=s.name,
            slug=s.slug,
            description=s.description,
            durationMinutes=s.duration_minutes,
            bufferBeforeMinutes=s.buffer_before_minutes,
            bufferAfterMinutes=s.buffer_after_minutes,
            price=float(s.price),
            currency=s.currency,
            locationType=s.location_type,
            locationDetails=s.location_details,
        )
        for s in services_res.scalars().all()
    ]


@router.get("/availability", response_model=AvailabilityResponse)
async def get_availability(
    workspaceSlug: str = Query(...),
    serviceSlug: str = Query(...),
    target_date: str = Query(..., alias="date", description="Date in YYYY-MM-DD format"),
    client_tz: str = Query("Asia/Kolkata", alias="timezone"),
    staffId: Optional[str] = Query(None, description="Restrict to one staff member"),
    db: AsyncSession = Depends(get_db),
):
    """
    Open time slots for a service on a date.

    Honours each staff member's weekly hours, breaks and date overrides in the
    workspace timezone, applies the service's buffers, and excludes times that
    are already taken.
    """
    try:
        booking_date = date.fromisoformat(target_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    display_tz = _safe_zone(client_tz, "Asia/Kolkata")

    ws = await _get_workspace(db, workspaceSlug)
    service = await _get_service(db, ws, serviceSlug)
    staff_members = await _candidate_staff(db, ws, service, staffId)

    workspace_tz = _safe_zone(ws.timezone)
    slot_map: dict = {}

    for staff in staff_members:
        schedule = await _schedule_for(db, staff, booking_date, workspace_tz)
        if schedule is None:
            continue
        window, busy = schedule

        for slot_start, slot_end, _local in compute_slots(
            booking_date=booking_date,
            tz=workspace_tz,
            window=window,
            busy=busy,
            duration_minutes=service.duration_minutes or DEFAULT_SLOT_STEP_MINUTES,
            buffer_before_minutes=service.buffer_before_minutes or 0,
            buffer_after_minutes=service.buffer_after_minutes or 0,
        ):
            if slot_start in slot_map:
                continue
            local_start = slot_start.astimezone(display_tz)
            slot_map[slot_start] = AvailabilitySlot(
                startTime=local_start.isoformat(),
                endTime=slot_end.astimezone(display_tz).isoformat(),
                displayTime=local_start.strftime("%I:%M %p"),
                available=True,
                staffId=staff.id,
                staffName=staff.name,
            )

    return AvailabilityResponse(
        date=target_date,
        timezone=str(display_tz),
        slots=[slot_map[key] for key in sorted(slot_map)],
    )


@router.post("/bookings", response_model=BookingConfirmation, status_code=status.HTTP_201_CREATED)
async def create_booking(req: CreateBookingRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """
    Create a confirmed appointment.

    The endpoint is unauthenticated, so the requested time is re-checked against
    the same availability engine that produced the slot list, and the end time
    is derived from the service rather than taken from the request. Accepting a
    client-supplied window would allow a booking on a rest day, inside a lunch
    break, or of an arbitrary length.
    """
    if not (
        await check_rate_limit(f"public-booking:{caller_address(request)}", *PUBLIC_BOOKING_LIMIT)
    ).allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many booking attempts. Please wait a while and try again.",
        )

    ws = await _get_workspace(db, req.workspaceSlug)
    service = await _get_service(db, ws, req.serviceSlug)

    workspace_tz = _safe_zone(ws.timezone)
    booking_date = req.startTime.astimezone(workspace_tz).date()

    # Scoped to the workspace so one tenant cannot read another's booking by
    # guessing or reusing an idempotency key.
    if req.idempotencyKey:
        existing_res = await db.execute(
            select(Booking).where(
                and_(
                    Booking.workspace_id == ws.id,
                    Booking.idempotency_key == req.idempotencyKey,
                )
            )
        )
        existing = existing_res.scalar_one_or_none()
        if existing:
            staff_res = await db.execute(select(Staff).where(Staff.id == existing.staff_id))
            cust_res = await db.execute(select(Customer).where(Customer.id == existing.customer_id))
            staff_row = staff_res.scalar_one()
            customer_row = cust_res.scalar_one()
            return BookingConfirmation(
                id=existing.id,
                status=existing.status,
                serviceName=service.name,
                staffName=staff_row.name,
                startTime=existing.start_time.isoformat(),
                endTime=existing.end_time.isoformat(),
                customerName=customer_row.name,
                customerEmail=customer_row.email,
                meetingLink=existing.meeting_link,
                message="Appointment already confirmed",
            )

    candidates = await _candidate_staff(db, ws, service, req.staffId)
    if not candidates:
        raise HTTPException(
            status_code=400,
            detail=(
                "The selected staff member is not available for this service."
                if req.staffId
                else "No staff are available for this service."
            ),
        )

    # Re-run the engine and take the first staff member for whom this exact
    # start time is genuinely bookable.
    chosen_staff: Optional[Staff] = None
    chosen_end: Optional[datetime] = None

    for staff in candidates:
        schedule = await _schedule_for(db, staff, booking_date, workspace_tz)
        if schedule is None:
            continue
        window, busy = schedule

        for slot_start, slot_end, _local in compute_slots(
            booking_date=booking_date,
            tz=workspace_tz,
            window=window,
            busy=busy,
            duration_minutes=service.duration_minutes or DEFAULT_SLOT_STEP_MINUTES,
            buffer_before_minutes=service.buffer_before_minutes or 0,
            buffer_after_minutes=service.buffer_after_minutes or 0,
        ):
            if slot_start == req.startTime:
                chosen_staff = staff
                chosen_end = slot_end
                break
        if chosen_staff:
            break

    if chosen_staff is None or chosen_end is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That time is not available. Please choose another slot.",
        )

    cust_email = req.customerEmail.strip().lower()
    cust_res = await db.execute(
        select(Customer).where(
            and_(Customer.workspace_id == ws.id, Customer.email == cust_email)
        )
    )
    customer = cust_res.scalar_one_or_none()
    if not customer:
        customer = Customer(
            workspace_id=ws.id,
            name=req.customerName.strip(),
            email=cust_email,
            phone=req.customerPhone,
            notes=req.notes,
        )
        db.add(customer)
        await db.flush()

    # meeting_link holds a URL, so a non-online service leaves it null and the
    # service's own location details are shown instead.
    meeting_link = (
        f"https://meet.jit.si/rooman-{uuid.uuid4().hex[:24]}"
        if service.location_type == "ONLINE_MEETING"
        else None
    )

    booking = Booking(
        workspace_id=ws.id,
        service_id=service.id,
        staff_id=chosen_staff.id,
        customer_id=customer.id,
        start_time=req.startTime,
        end_time=chosen_end,
        customer_timezone=req.customerTimezone,
        status="CONFIRMED",
        meeting_link=meeting_link,
        idempotency_key=req.idempotencyKey,
    )
    db.add(booking)

    try:
        await db.commit()
    except IntegrityError as err:
        await db.rollback()
        # Two requests can both pass the availability check and both insert; the
        # database exclusion constraint refuses the second. That is a conflict
        # for the caller, not a server fault.
        sqlstate = getattr(getattr(err, "orig", None), "sqlstate", None)
        if sqlstate == EXCLUSION_VIOLATION or EXCLUSION_VIOLATION in str(err):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="That time slot was just booked. Please choose another.",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Could not save the appointment. Please try again.",
        )

    await db.refresh(booking)

    return BookingConfirmation(
        id=booking.id,
        status=booking.status,
        serviceName=service.name,
        staffName=chosen_staff.name,
        startTime=booking.start_time.isoformat(),
        endTime=booking.end_time.isoformat(),
        customerName=customer.name,
        customerEmail=customer.email,
        meetingLink=booking.meeting_link,
        message="Appointment successfully confirmed",
    )
