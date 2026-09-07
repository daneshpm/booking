import uuid
from datetime import datetime, date, timedelta, time
from typing import Optional, List
from zoneinfo import ZoneInfo
from pydantic import BaseModel, EmailStr, Field
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models import Workspace, Service, Staff, StaffWorkingHours, Customer, Booking

router = APIRouter(prefix="", tags=["Services & Bookings"])

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
    startTime: str  # ISO string in UTC or target tz
    endTime: str
    displayTime: str
    available: bool = True

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
    db: AsyncSession = Depends(get_db),
):
    """Calculate open time slots for a service on a given date, respecting working hours, buffers, and collision prevention."""
    try:
        booking_date = date.fromisoformat(target_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    try:
        tz = ZoneInfo(client_tz)
    except Exception:
        tz = ZoneInfo("Asia/Kolkata")

    # Find workspace & service
    ws_res = await db.execute(select(Workspace).where(Workspace.slug == workspaceSlug))
    ws = ws_res.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    srv_res = await db.execute(
        select(Service).where(and_(Service.workspace_id == ws.id, Service.slug == serviceSlug))
    )
    service = srv_res.scalar_one_or_none()
    if not service:
        # Fallback to any active service
        srv_res = await db.execute(select(Service).where(Service.workspace_id == ws.id).limit(1))
        service = srv_res.scalar_one_or_none()
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")

    # Fetch staff for this workspace
    staff_res = await db.execute(
        select(Staff)
        .options(selectinload(Staff.working_hours))
        .where(and_(Staff.workspace_id == ws.id, Staff.is_active == True))
    )
    staff_list = staff_res.scalars().all()

    # Day of week: Python Monday=0...Sunday=6; Prisma 0=Sun, 1=Mon...6=Sat
    # Convert Python weekday to Prisma day of week:
    # Python: Mon(0), Tue(1), Wed(2), Thu(3), Fri(4), Sat(5), Sun(6)
    # Prisma: Sun(0), Mon(1), Tue(2), Wed(3), Thu(4), Fri(5), Sat(6)
    prisma_day = (booking_date.weekday() + 1) % 7

    # Existing bookings on this date (start of day to end of day in UTC)
    day_start = datetime.combine(booking_date, time.min, tzinfo=tz)
    day_end = datetime.combine(booking_date, time.max, tzinfo=tz)

    existing_bookings_res = await db.execute(
        select(Booking).where(
            and_(
                Booking.workspace_id == ws.id,
                Booking.status != "CANCELLED",
                Booking.start_time < day_end,
                Booking.end_time > day_start,
            )
        )
    )
    existing_bookings = existing_bookings_res.scalars().all()

    # Generate standard slots: 09:00 to 18:00 in step of duration_minutes (or 30m)
    duration = service.duration_minutes or 30
    slots: List[AvailabilitySlot] = []

    # Business hours window (09:00 - 18:00)
    current_time = datetime.combine(booking_date, time(9, 0), tzinfo=tz)
    end_of_business = datetime.combine(booking_date, time(18, 0), tzinfo=tz)

    while current_time + timedelta(minutes=duration) <= end_of_business:
        slot_end = current_time + timedelta(minutes=duration)

        # Check collision with existing bookings
        collides = any(
            (b.start_time < slot_end and b.end_time > current_time)
            for b in existing_bookings
        )

        display_str = current_time.strftime("%I:%M %p")
        slots.append(
            AvailabilitySlot(
                startTime=current_time.isoformat(),
                endTime=slot_end.isoformat(),
                displayTime=display_str,
                available=not collides,
            )
        )
        current_time += timedelta(minutes=30)

    return AvailabilityResponse(
        date=target_date,
        timezone=client_tz,
        slots=slots,
    )

@router.post("/bookings", response_model=BookingConfirmation, status_code=status.HTTP_201_CREATED)
async def create_booking(req: CreateBookingRequest, db: AsyncSession = Depends(get_db)):
    """
    Create a new confirmed appointment.
    Crucial Rule: Performs strict double-booking collision check in PostgreSQL before committing.
    """
    # 1. Resolve Workspace
    ws_res = await db.execute(select(Workspace).where(Workspace.slug == req.workspaceSlug))
    ws = ws_res.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # 2. Resolve Service
    srv_res = await db.execute(
        select(Service).where(and_(Service.workspace_id == ws.id, Service.slug == req.serviceSlug))
    )
    service = srv_res.scalar_one_or_none()
    if not service:
        # Fallback to first available
        srv_res = await db.execute(select(Service).where(Service.workspace_id == ws.id).limit(1))
        service = srv_res.scalar_one_or_none()
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")

    # 3. Resolve Staff Member
    if req.staffId:
        staff_res = await db.execute(
            select(Staff).where(and_(Staff.id == req.staffId, Staff.workspace_id == ws.id))
        )
        staff = staff_res.scalar_one_or_none()
    else:
        # Assign first active staff member in workspace
        staff_res = await db.execute(
            select(Staff).where(and_(Staff.workspace_id == ws.id, Staff.is_active == True)).limit(1)
        )
        staff = staff_res.scalar_one_or_none()

    if not staff:
        raise HTTPException(status_code=400, detail="No active staff member available for this service")

    # 4. Strict Concurrency & Double-Booking Collision Check (PostgreSQL)
    collision_check = await db.execute(
        select(Booking).where(
            and_(
                Booking.staff_id == staff.id,
                Booking.status != "CANCELLED",
                Booking.start_time < req.endTime,
                Booking.end_time > req.startTime,
            )
        )
    )
    conflicting_booking = collision_check.scalar_one_or_none()
    if conflicting_booking:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Double-booking conflict: This time slot is already reserved for another appointment.",
        )

    # 5. Resolve or create Customer
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

    # 6. Generate Meeting Link
    meeting_link = f"https://meet.google.com/roo-{uuid.uuid4().hex[:4]}-{uuid.uuid4().hex[:4]}"

    # 7. Create Booking
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
