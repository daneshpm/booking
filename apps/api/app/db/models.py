import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Boolean,
    Integer,
    Numeric,
    DateTime,
    ForeignKey,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import ENUM
from app.db.session import Base

RoleEnum = ENUM("OWNER", "ADMIN", "STAFF", "RECEPTIONIST", name="Role", create_type=False)
BookingStatusEnum = ENUM("PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW", "RESCHEDULED", name="BookingStatus", create_type=False)
LocationTypeEnum = ENUM("ONLINE_MEETING", "IN_PERSON_BUSINESS", "IN_PERSON_CUSTOMER", "PHONE_CALL", name="LocationType", create_type=False)

def gen_uuid() -> str:
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    passwordHash = Column(String, nullable=False)
    avatarUrl = Column(String, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    memberships = relationship("WorkspaceMember", back_populates="user", cascade="all, delete-orphan")
    staff_profiles = relationship("Staff", back_populates="user")


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False, index=True)
    logoUrl = Column(String, nullable=True)
    timezone = Column(String, default="UTC", nullable=False)
    currency = Column(String, default="USD", nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    members = relationship("WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan")
    staff = relationship("Staff", back_populates="workspace", cascade="all, delete-orphan")
    services = relationship("Service", back_populates="workspace", cascade="all, delete-orphan")
    customers = relationship("Customer", back_populates="workspace", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="workspace", cascade="all, delete-orphan")


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"

    id = Column(String, primary_key=True, default=gen_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(RoleEnum, default="STAFF", nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("workspace_id", "user_id", name="uq_workspace_members_workspace_user"),
    )

    workspace = relationship("Workspace", back_populates="members")
    user = relationship("User", back_populates="memberships")


class Staff(Base):
    __tablename__ = "staff"

    id = Column(String, primary_key=True, default=gen_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    avatarUrl = Column(String, nullable=True)
    timezone = Column(String, default="UTC", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("workspace_id", "email", name="uq_staff_workspace_email"),
        Index("idx_staff_workspace_active", "workspace_id", "is_active"),
    )

    workspace = relationship("Workspace", back_populates="staff")
    user = relationship("User", back_populates="staff_profiles")
    working_hours = relationship("StaffWorkingHours", back_populates="staff", cascade="all, delete-orphan")
    service_assignments = relationship("ServiceStaff", back_populates="staff", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="staff")


class StaffWorkingHours(Base):
    __tablename__ = "staff_working_hours"

    id = Column(String, primary_key=True, default=gen_uuid)
    staff_id = Column(String, ForeignKey("staff.id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0=Sun, 1=Mon... 6=Sat
    start_time = Column(String, nullable=False)   # "09:00"
    end_time = Column(String, nullable=False)     # "17:00"

    __table_args__ = (
        UniqueConstraint("staff_id", "day_of_week", name="uq_staff_working_hours_staff_day"),
    )

    staff = relationship("Staff", back_populates="working_hours")
    breaks = relationship("StaffBreak", back_populates="working_hours", cascade="all, delete-orphan")


class StaffBreak(Base):
    __tablename__ = "staff_breaks"

    id = Column(String, primary_key=True, default=gen_uuid)
    staff_working_hours_id = Column(
        String, ForeignKey("staff_working_hours.id", ondelete="CASCADE"), nullable=False
    )
    start_time = Column(String, nullable=False)  # "13:00"
    end_time = Column(String, nullable=False)    # "14:00"

    working_hours = relationship("StaffWorkingHours", back_populates="breaks")


class Service(Base):
    __tablename__ = "services"

    id = Column(String, primary_key=True, default=gen_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(String, nullable=True)
    name = Column(String, nullable=False)
    slug = Column(String, nullable=False)
    description = Column(String, nullable=True)
    duration_minutes = Column(Integer, default=30, nullable=False)
    buffer_before_minutes = Column(Integer, default=0, nullable=False)
    buffer_after_minutes = Column(Integer, default=0, nullable=False)
    price = Column(Numeric(10, 2), default=0.00, nullable=False)
    currency = Column(String, default="USD", nullable=False)
    location_type = Column(LocationTypeEnum, default="ONLINE_MEETING", nullable=False)
    location_details = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("workspace_id", "slug", name="uq_services_workspace_slug"),
        Index("idx_services_workspace_active", "workspace_id", "is_active"),
    )

    workspace = relationship("Workspace", back_populates="services")
    staff_assignments = relationship("ServiceStaff", back_populates="service", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="service")


class ServiceStaff(Base):
    __tablename__ = "service_staff"

    id = Column(String, primary_key=True, default=gen_uuid)
    service_id = Column(String, ForeignKey("services.id", ondelete="CASCADE"), nullable=False)
    staff_id = Column(String, ForeignKey("staff.id", ondelete="CASCADE"), nullable=False)
    price_override = Column(Numeric(10, 2), nullable=True)
    duration_override = Column(Integer, nullable=True)

    __table_args__ = (
        UniqueConstraint("service_id", "staff_id", name="uq_service_staff_service_staff"),
    )

    service = relationship("Service", back_populates="staff_assignments")
    staff = relationship("Staff", back_populates="service_assignments")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(String, primary_key=True, default=gen_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("workspace_id", "email", name="uq_customers_workspace_email"),
        Index("idx_customers_workspace_name", "workspace_id", "name"),
    )

    workspace = relationship("Workspace", back_populates="customers")
    bookings = relationship("Booking", back_populates="customer")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(String, primary_key=True, default=gen_uuid)
    workspace_id = Column(String, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    service_id = Column(String, ForeignKey("services.id", ondelete="RESTRICT"), nullable=False)
    staff_id = Column(String, ForeignKey("staff.id", ondelete="RESTRICT"), nullable=False)
    customer_id = Column(String, ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    customer_timezone = Column(String, default="UTC", nullable=False)
    status = Column(BookingStatusEnum, default="CONFIRMED", nullable=False)
    cancellation_reason = Column(String, nullable=True)
    rescheduled_from_id = Column(String, nullable=True)
    meeting_link = Column(String, nullable=True)
    idempotency_key = Column(String, unique=True, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    workspace = relationship("Workspace", back_populates="bookings")
    service = relationship("Service", back_populates="bookings")
    staff = relationship("Staff", back_populates="bookings")
    customer = relationship("Customer", back_populates="bookings")
