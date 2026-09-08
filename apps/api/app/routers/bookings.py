import uuid
from datetime import datetime, date, timedelta, timezone
from typing import Optional, List, Sequence, Tuple
from zoneinfo import ZoneInfo
from pydantic import BaseModel, EmailStr, Field, model_validator
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models import (
    Workspace,
    Service,
    Staff,
    StaffWorkingHours,
    Customer,
    Booking,
)

router = APIRouter(prefix="", tags=["Services & Bookings"])

# Slots must start at least this far in the future to be offered.
MIN_LEAD_TIME = timedelta(minutes=10)
# Slot step: 30 minutes, or the service duration if it is shorter.
DEFAULT_SLOT_STEP_MINUTES = 30

# Pydantic Schemas
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
    startTime: str  # ISO 8601 in the requested client timezone
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
    workspaceSlug: str = Field(..., description="Workspace slug (e.g. rooman-technologies)")
    serviceSlug: str = Field(..., description="Service slug (e.g. career-guidance)")
    staffId: Optional[str] = None
    startTime: datetime = Field(..., description="Booking start timestamp (ISO 8601 with timezone)")
    endTime: datetime = Field(..., description="Booking end timestamp (ISO 8601 with timezone)")
    customerName: str = Field(..., min_length=1)
    customerEmail: EmailStr
    customerPhone: Optional[str] = None
    customerTimezone: str = "Asia/Kolkata"
    notes: Optional[str] = None

    @model_validator(mode="after")
    def _validate_interval(self) -> "CreateBookingRequest":
        # asyncpg cannot compare naive datetimes against timestamptz columns, so
        # reject them up front with a 422 instead of failing deep in the query.
        if self.startTime.tzinfo is None or self.endTime.tzinfo is None:
            raise ValueError("startTime and endTime must include a timezone offset (e.g. 2026-10-20T10:00:00Z)")
        if self.endTime <= self.startTime:
            raise ValueError("endTime must be after startTime")
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
# Pure helpers (no database access; unit-tested)
# ----------------------------------------------------

def parse_hhmm(value: str) -> int:
    """Convert a "HH:MM" string to minutes since midnight."""
    hours, minutes = value.split(":")
    return int(hours) * 60 + int(minutes)


def prisma_day_of_week(day: date) -> int:
    """Python weekday() is Mon=0..Sun=6; the schema stores Sun=0..Sat=6."""
    return (day.weekday() + 1) % 7


def compute_staff_slots(
    *,
    booking_date: date,
    tz: ZoneInfo,
    shift_start_minutes: int,
    shift_end_minutes: int,
    breaks: Sequence[Tuple[int, int]],
    busy: Sequence[Tuple[datetime, datetime]],
    duration_minutes: int,
    buffer_before_minutes: int = 0,
    buffer_after_minutes: int = 0,
    step_minutes: Optional[int] = None,
    now: Optional[datetime] = None,
) -> List[Tuple[datetime, datetime]]:
    """
    Generate bookable (start, end) intervals for one staff member on one day.

    - Shift and breaks are minutes-since-midnight in ``tz`` (the workspace timezone).
    - ``busy`` holds timezone-aware booking intervals.
    - Buffers pad the candidate slot before checking collisions with breaks and
      bookings, mirroring the Prisma implementation in apps/web/app/book/actions.ts.
    """
    step = step_minutes or min(DEFAULT_SLOT_STEP_MINUTES, duration_minutes)
    if step <= 0 or duration_minutes <= 0:
        return []

    now = now or datetime.now(timezone.utc)
    midnight = datetime.combine(booking_date, datetime.min.time(), tzinfo=tz)

    def at(minutes: int) -> datetime:
        return midnight + timedelta(minutes=minutes)

    break_intervals = [(at(s), at(e)) for s, e in breaks]

    slots: List[Tuple[datetime, datetime]] = []
    current = shift_start_minutes
    while current + duration_minutes <= shift_end_minutes:
        slot_start = at(current)
        slot_end = at(current + duration_minutes)
        padded_start = slot_start - timedelta(minutes=buffer_before_minutes)
        padded_end = slot_end + timedelta(minutes=buffer_after_minutes)

        collides = any(padded_start < e and padded_end > s for s, e in break_intervals) or any(
            padded_start < e and padded_end > s for s, e in busy
        )
        is_past = slot_start <= now + MIN_LEAD_TIME

        if not collides and not is_past:
            slots.append((slot_start, slot_end))
        current += step

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
        select(Service)
        .options(selectinload(Service.staff_assignments))
        .where(and_(Service.workspace_id == ws.id, Service.slug == slug, Service.is_active == True))
    )
    service = res.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service


async def _candidate_staff(
    db: AsyncSession, ws: Workspace, service: Service, staff_id: Optional[str] = None
) -> List[Staff]:
    """
    Staff eligible to deliver ``service``: the requested staff member if given,
    otherwise the service's assigned staff, otherwise every active staff member
    in the workspace. Working hours and breaks are eager-loaded.
    """
    query = (
        select(Staff)
        .options(selectinload(Staff.working_hours).selectinload(StaffWorkingHours.breaks))
        .where(and_(Staff.workspace_id == ws.id, Staff.is_active == True))
        .order_by(Staff.name.asc())
    )
    if staff_id:
        query = query.where(Staff.id == staff_id)
    else:
        assigned_ids = [a.staff_id for a in service.staff_assignments]
        if assigned_ids:
            query = query.where(Staff.id.in_(assigned_ids))

    res = await db.execute(query)
    return list(res.scalars().all())


async def _staff_bookings_between(
    db: AsyncSession, staff_id: str, window_start: datetime, window_end: datetime
) -> List[Booking]:
    res = await db.execute(
        select(Booking).where(
            and_(
                Booking.staff_id == staff_id,
                Booking.status != "CANCELLED",
                Booking.start_time < window_end,
                Booking.end_time > window_start,
            )
        )
    )
    return list(res.scalars().all())


# ----------------------------------------------------
# Routes
# ----------------------------------------------------

@router.get("/services", response_model=List[ServiceDTO])
async def list_services(
    workspaceSlug: str = Query("rooman-technologies", description="Slug of the workspace"),
    db: AsyncSession = Depends(get_db),
):
    """List all active services for a given workspace."""
    ws_res = await db.execute(select(Workspace).where(Workspace.slug == workspaceSlug))
    ws = ws_res.scalar_one_or_none()
    if not ws:
        # Fallback to first workspace if slug not found
        ws_res = await db.execute(select(Workspace).order_by(Workspace.createdAt.asc()).limit(1))
        ws = ws_res.scalar_one_or_none()
        if not ws:
            raise HTTPException(status_code=404, detail="Workspace not found")

    services_res = await db.execute(
        select(Service)
        .where(and_(Service.workspace_id == ws.id, Service.is_active == True))
        .order_by(Service.createdAt.asc())
    )
    services = services_res.scalars().all()

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
        for s in services
    ]

@router.get("/availability", response_model=AvailabilityResponse)
async def get_availability(
    workspaceSlug: str = Query("rooman-technologies"),
    serviceSlug: str = Query("career-guidance"),
    target_date: str = Query(..., alias="date", description="Date in YYYY-MM-DD format"),
    client_tz: str = Query("Asia/Kolkata", alias="timezone"),
    staffId: Optional[str] = Query(None, description="Restrict to one staff member"),
    db: AsyncSession = Depends(get_db),
):
    """
    Calculate open time slots for a service on a given date.

    Honours each staff member's weekly working hours and breaks (interpreted in
    the workspace timezone), the service's pre/post buffers, and existing
    bookings per staff member. A slot is offered when at least one eligible
    staff member is free; the first free member is reported on the slot.
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
    day_of_week = prisma_day_of_week(booking_date)
    day_start = datetime.combine(booking_date, datetime.min.time(), tzinfo=workspace_tz)
    day_end = day_start + timedelta(days=1)

    duration = service.duration_minutes or DEFAULT_SLOT_STEP_MINUTES
    now = datetime.now(timezone.utc)

    # Keyed by UTC start so identical slots from different staff collapse to one.
    slot_map: dict = {}

    for staff in staff_members:
        hours = next((h for h in staff.working_hours if h.day_of_week == day_of_week), None)
        if not hours:
            continue

        bookings = await _staff_bookings_between(db, staff.id, day_start, day_end)

        staff_slots = compute_staff_slots(
            booking_date=booking_date,
            tz=workspace_tz,
            shift_start_minutes=parse_hhmm(hours.start_time),
            shift_end_minutes=parse_hhmm(hours.end_time),
            breaks=[(parse_hhmm(b.start_time), parse_hhmm(b.end_time)) for b in hours.breaks],
            busy=[(b.start_time, b.end_time) for b in bookings],
            duration_minutes=duration,
            buffer_before_minutes=service.buffer_before_minutes or 0,
            buffer_after_minutes=service.buffer_after_minutes or 0,
            now=now,
        )

        for slot_start, slot_end in staff_slots:
            key = slot_start.astimezone(timezone.utc)
            if key in slot_map:
                continue
            local_start = slot_start.astimezone(display_tz)
            local_end = slot_end.astimezone(display_tz)
            slot_map[key] = AvailabilitySlot(
                startTime=local_start.isoformat(),
                endTime=local_end.isoformat(),
                displayTime=local_start.strftime("%I:%M %p"),
                available=True,
                staffId=staff.id,
                staffName=staff.name,
            )

    slots = [slot_map[k] for k in sorted(slot_map)]

    return AvailabilityResponse(
        date=target_date,
        timezone=str(display_tz),
        slots=slots,
    )

@router.post("/bookings", response_model=BookingConfirmation, status_code=status.HTTP_201_CREATED)
async def create_booking(req: CreateBookingRequest, db: AsyncSession = Depends(get_db)):
    """
    Create a new confirmed appointment.
    Crucial Rule: Performs strict double-booking collision check in PostgreSQL before committing.
    """
    ws = await _get_workspace(db, req.workspaceSlug)
    service = await _get_service(db, ws, req.serviceSlug)

    # Resolve eligible staff, then pick the first one who is free for the slot.
    candidates = await _candidate_staff(db, ws, service, req.staffId)
    if not candidates:
        raise HTTPException(status_code=400, detail="No active staff member available for this service")

    staff: Optional[Staff] = None
    for candidate in candidates:
        conflicts = await _staff_bookings_between(db, candidate.id, req.startTime, req.endTime)
        if not conflicts:
            staff = candidate
            break

    if staff is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Double-booking conflict: This time slot is already reserved for another appointment.",
        )

    # Resolve or create Customer
    cust_email = req.customerEmail.strip().lower()
    cust_res = await db.execute(
        select(Customer).where(
            and_(Customer.workspace_id == ws.id, Customer.email == cust_email)
        )
    )
    customer = cust_res.scalar_one_or_none()
    if not customer:
        customer = Customer(
            id=str(uuid.uuid4()),
            workspace_id=ws.id,
            name=req.customerName.strip(),
            email=cust_email,
            phone=req.customerPhone,
            notes=req.notes,
        )
        db.add(customer)
        await db.flush()

    meeting_link = f"https://meet.google.com/roo-{uuid.uuid4().hex[:4]}-{uuid.uuid4().hex[:4]}"

    booking = Booking(
        id=str(uuid.uuid4()),
        workspace_id=ws.id,
        service_id=service.id,
        staff_id=staff.id,
        customer_id=customer.id,
        start_time=req.startTime,
        end_time=req.endTime,
        customer_timezone=req.customerTimezone,
        status="CONFIRMED",
        meeting_link=meeting_link,
        idempotency_key=str(uuid.uuid4()),
    )
    db.add(booking)
    await db.commit()
    await db.refresh(booking)

    return BookingConfirmation(
        id=booking.id,
        status=booking.status,
        serviceName=service.name,
        staffName=staff.name,
        startTime=booking.start_time.isoformat(),
        endTime=booking.end_time.isoformat(),
        customerName=customer.name,
        customerEmail=customer.email,
        meetingLink=booking.meeting_link,
        message="Appointment successfully confirmed",
    )
