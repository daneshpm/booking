---
name: booking-engine
description: >-
  Provides end-to-end domain knowledge and procedures for extending and maintaining the core multi-tenant appointment scheduling engine. Activate this skill when working on slot generation, availability algorithms, buffer zones, double-booking collision checks, timezone transformations, or booking status lifecycles.
---

# Multi-Tenant Booking Engine Skill

This skill documents the core domain architecture, availability computation formulas, collision prevention, and data modeling for the appointment scheduling engine.

---

## 1. Pure Availability & Dynamic Slot Generation

- **Slot Step Formula**: Step interval is determined dynamically: `Math.min(30, service.durationMinutes)`.
- **Buffer Protection**:
  - Buffer Before: `slotStart - bufferBeforeMinutes`
  - Buffer After: `slotEnd + bufferAfterMinutes`
  - Must ensure neither break intervals nor existing bookings overlap with `[bufferedStart, bufferedEnd]`.
- **Shift & Day-of-Week Rules**:
  - Weekly schedule query: `prisma.staffWorkingHours.findUnique({ where: { staffId_dayOfWeek: { staffId, dayOfWeek } } })`.
  - Check for date overrides (`StaffOverride`): if `!override.isWorking`, the staff member is taking leave/holiday.

---

## 2. Zero Double-Booking Collision Prevention

- **Concurrency Query**:
  ```ts
  const conflict = await prisma.booking.findFirst({
    where: {
      staffId,
      status: { notIn: ['CANCELLED'] },
      AND: [{ startTime: { lt: requestedEndUtc } }, { endTime: { gt: requestedStartUtc } }],
    },
  });
  ```
- **Idempotency**:
  - Generate deterministic keys: `dash_${workspaceId}_${staffId}_${startTimeUtc}_${timestamp}`.

---

## 3. Timezone Transformations (`date-fns-tz`)

- Store all booking start and end timestamps in PostgreSQL as UTC (`@db.Timestamptz`).
- Convert local input string (`YYYY-MM-DD` + `HH:mm`) to UTC using `fromZonedTime(localStr, workspaceTimezone)`.
- Convert back to user/customer display timezone using `toZonedTime(utcDate, customerTimezone)`.

---

## 4. Status Lifecycle & Auditing

- Statuses: `PENDING` -> `CONFIRMED` -> `COMPLETED` | `CANCELLED` | `RESCHEDULED`.
- Every transition must record an entry in `BookingAuditLog` with `action`, `actorType`, and `details` JSON.
