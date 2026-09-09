'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@bookings/database';
import { z } from 'zod';
import { requireWorkspace, toActionError } from '@/lib/session';

/**
 * Shared result shape for every staff action, so callers can narrow on
 * `success` without the union collapsing to a variant that has no `error`.
 */
export interface StaffActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Keep only the service ids that actually belong to this workspace.
 *
 * The list arrives from the browser, so an id from another tenant would
 * otherwise create a cross-workspace assignment row.
 */
async function scopeServiceIds(workspaceId: string, serviceIds: string[]): Promise<string[]> {
  if (serviceIds.length === 0) return [];
  const owned = await prisma.service.findMany({
    where: { workspaceId, id: { in: serviceIds } },
    select: { id: true },
  });
  return owned.map((s) => s.id);
}

const staffSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional().nullable(),
  timezone: z.string().default('UTC'),
  isActive: z.boolean().default(true),
  assignedServiceIds: z.array(z.string()).default([]),
});

function serializeStaff<T extends { serviceAssignments?: any[] } | null | undefined>(staff: T): T {
  if (!staff) return staff;
  return {
    ...staff,
    serviceAssignments: staff.serviceAssignments?.map((sa: any) => ({
      ...sa,
      priceOverride: sa.priceOverride != null ? Number(sa.priceOverride) : null,
      service: sa.service
        ? {
            ...sa.service,
            price: sa.service.price != null ? Number(sa.service.price) : 0,
          }
        : sa.service,
    })),
  };
}

export async function createStaffAction(
  workspaceId: string,
  rawData: {
    name: string;
    email: string;
    phone?: string | null;
    timezone?: string;
    isActive?: boolean;
    assignedServiceIds?: string[];
  }
): Promise<StaffActionResult> {
  try {
    await requireWorkspace(workspaceId, 'ADMIN');
    const validated = staffSchema.parse(rawData);
    const assignedServiceIds = await scopeServiceIds(workspaceId, validated.assignedServiceIds);

    // Check if email already exists in this workspace
    const existing = await prisma.staff.findUnique({
      where: {
        workspaceId_email: {
          workspaceId,
          email: validated.email.toLowerCase().trim(),
        },
      },
    });

    if (existing) {
      return {
        success: false,
        error: 'A staff member with this email already exists in this workspace.',
      };
    }

    // Default working hours: Mon(1) to Fri(5), 09:00 - 17:00, lunch 13:00 - 14:00
    const defaultWorkingDays = [1, 2, 3, 4, 5];

    const staff = await prisma.staff.create({
      data: {
        workspaceId,
        name: validated.name.trim(),
        email: validated.email.toLowerCase().trim(),
        phone: validated.phone?.trim() || null,
        timezone: validated.timezone || 'UTC',
        isActive: validated.isActive,
        serviceAssignments: {
          create: assignedServiceIds.map((serviceId) => ({ serviceId })),
        },
        workingHours: {
          create: defaultWorkingDays.map((day) => ({
            dayOfWeek: day,
            startTime: '09:00',
            endTime: '17:00',
            breaks: {
              create: [
                {
                  startTime: '13:00',
                  endTime: '14:00',
                },
              ],
            },
          })),
        },
      },
      include: {
        serviceAssignments: {
          include: { service: true },
        },
        workingHours: {
          include: { breaks: true },
        },
      },
    });

    revalidatePath('/staff');
    revalidatePath('/users');
    revalidatePath('/schedules');
    revalidatePath('/availability');
    revalidatePath('/services');
    revalidatePath('/calendar');

    return {
      success: true,
      data: serializeStaff(staff),
    };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.errors[0].message };
    }
    return toActionError(err);
  }
}

export async function updateStaffAction(
  workspaceId: string,
  staffId: string,
  rawData: {
    name: string;
    email: string;
    phone?: string | null;
    timezone?: string;
    isActive?: boolean;
    assignedServiceIds?: string[];
  }
): Promise<StaffActionResult> {
  try {
    await requireWorkspace(workspaceId, 'ADMIN');
    const validated = staffSchema.parse(rawData);
    const assignedServiceIds = await scopeServiceIds(workspaceId, validated.assignedServiceIds);

    // Verify staff belongs to workspace
    const existing = await prisma.staff.findFirst({
      where: { id: staffId, workspaceId },
    });

    if (!existing) {
      return { success: false, error: 'Staff member not found in this workspace' };
    }

    // Check email clash if email is changed
    if (validated.email.toLowerCase().trim() !== existing.email.toLowerCase()) {
      const duplicate = await prisma.staff.findUnique({
        where: {
          workspaceId_email: {
            workspaceId,
            email: validated.email.toLowerCase().trim(),
          },
        },
      });
      if (duplicate && duplicate.id !== staffId) {
        return {
          success: false,
          error: 'A staff member with this email already exists in this workspace.',
        };
      }
    }

    // Sync service assignments in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Update basic info
      await tx.staff.update({
        where: { id: staffId },
        data: {
          name: validated.name.trim(),
          email: validated.email.toLowerCase().trim(),
          phone: validated.phone?.trim() || null,
          timezone: validated.timezone,
          isActive: validated.isActive,
        },
      });

      // 2. Remove obsolete service assignments
      await tx.serviceStaff.deleteMany({
        where: {
          staffId,
          serviceId: { notIn: assignedServiceIds },
        },
      });

      // 3. Upsert assigned services
      for (const serviceId of assignedServiceIds) {
        await tx.serviceStaff.upsert({
          where: {
            serviceId_staffId: {
              serviceId,
              staffId,
            },
          },
          update: {},
          create: {
            serviceId,
            staffId,
          },
        });
      }
    });

    const updatedStaff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        serviceAssignments: {
          include: { service: true },
        },
        workingHours: {
          include: { breaks: true },
        },
      },
    });

    revalidatePath('/staff');
    revalidatePath('/users');
    revalidatePath('/schedules');
    revalidatePath('/availability');
    revalidatePath('/services');
    revalidatePath('/calendar');

    return {
      success: true,
      data: serializeStaff(updatedStaff),
    };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.errors[0].message };
    }
    return toActionError(err);
  }
}

export async function toggleStaffStatusAction(
  workspaceId: string,
  staffId: string,
  isActive: boolean
): Promise<StaffActionResult> {
  try {
    await requireWorkspace(workspaceId, 'ADMIN');
    const updated = await prisma.staff.update({
      where: { id: staffId, workspaceId },
      data: { isActive },
    });

    revalidatePath('/staff');
    revalidatePath('/users');
    revalidatePath('/schedules');
    revalidatePath('/availability');
    return { success: true, data: updated };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteStaffAction(
  workspaceId: string,
  staffId: string
): Promise<StaffActionResult> {
  try {
    await requireWorkspace(workspaceId, 'ADMIN');

    // Check if staff belongs to workspace
    const existing = await prisma.staff.findFirst({
      where: { id: staffId, workspaceId },
      include: { bookings: { select: { id: true, status: true } } },
    });

    if (!existing) {
      return { success: false, error: 'Staff member not found' };
    }

    // Booking.staff is onDelete: Restrict, so any remaining booking blocks the
    // delete at the database. Counting only CONFIRMED and PENDING let a staff
    // member with COMPLETED or RESCHEDULED history past this check and turned a
    // clear message into a generic failure.
    const blocking = existing.bookings.length;
    if (blocking > 0) {
      const upcoming = existing.bookings.filter(
        (b) => b.status === 'CONFIRMED' || b.status === 'PENDING'
      ).length;
      return {
        success: false,
        error:
          upcoming > 0
            ? `This staff member has ${upcoming} scheduled appointment${upcoming === 1 ? '' : 's'}. Reassign or cancel them first.`
            : `This staff member has ${blocking} appointment${blocking === 1 ? '' : 's'} in their history and cannot be deleted. Deactivate them instead to remove them from booking.`,
      };
    }

    // Delete staff member (cascades service assignments, working hours, etc.)
    await prisma.staff.delete({
      where: { id: staffId },
    });

    revalidatePath('/staff');
    revalidatePath('/users');
    revalidatePath('/schedules');
    revalidatePath('/availability');
    revalidatePath('/services');
    revalidatePath('/calendar');

    return { success: true };
  } catch (err) {
    return toActionError(err);
  }
}

export interface DayScheduleInput {
  dayOfWeek: number; // 0..6
  enabled: boolean;
  startTime: string; // "09:00"
  endTime: string; // "17:00"
  hasBreak?: boolean;
  breakStartTime?: string; // "13:00"
  breakEndTime?: string; // "14:00"
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Reject a schedule the availability engine could not interpret.
 *
 * A shift that ends before it starts, or a break outside its shift, would
 * silently produce zero bookable slots rather than an error the operator can
 * see and fix.
 */
const DAYS_LIST = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function validateSchedule(schedule: DayScheduleInput[]): string | null {
  for (const day of schedule) {
    if (!day.enabled) continue;

    const dayName = DAYS_LIST[day.dayOfWeek] || `Day ${day.dayOfWeek}`;

    if (day.dayOfWeek < 0 || day.dayOfWeek > 6) {
      return `${dayName}: Each shift must fall on a valid day of the week.`;
    }
    if (!day.startTime || !day.endTime || !TIME_PATTERN.test(day.startTime) || !TIME_PATTERN.test(day.endTime)) {
      return `${dayName}: Shift times must be valid and in HH:MM format (e.g. 09:00).`;
    }

    const start = toMinutes(day.startTime);
    const end = toMinutes(day.endTime);
    if (end <= start) {
      return `${dayName}: Shift end time (${day.endTime}) must be after start time (${day.startTime}).`;
    }

    if (day.hasBreak) {
      if (!day.breakStartTime || !day.breakEndTime) {
        return `${dayName}: A break needs both a start and an end time.`;
      }
      if (!TIME_PATTERN.test(day.breakStartTime) || !TIME_PATTERN.test(day.breakEndTime)) {
        return `${dayName}: Break times must be in HH:MM format (e.g. 13:00).`;
      }
      const breakStart = toMinutes(day.breakStartTime);
      const breakEnd = toMinutes(day.breakEndTime);
      if (breakEnd <= breakStart) {
        return `${dayName}: Break end time (${day.breakEndTime}) must be after break start (${day.breakStartTime}).`;
      }
      if (breakStart < start || breakEnd > end) {
        return `${dayName}: Break (${day.breakStartTime}–${day.breakEndTime}) must fall inside shift hours (${day.startTime}–${day.endTime}).`;
      }
    }
  }
  return null;
}

function toMinutes(value: string): number {
  if (!value || !value.includes(':')) return 0;
  const [hours, minutes] = value.split(':');
  return (Number(hours) || 0) * 60 + (Number(minutes) || 0);
}

export async function updateStaffWorkingHoursAction(
  workspaceId: string,
  staffId: string,
  schedule: DayScheduleInput[]
): Promise<StaffActionResult> {
  try {
    await requireWorkspace(workspaceId, 'ADMIN');

    const existing = await prisma.staff.findFirst({
      where: { id: staffId, workspaceId },
    });

    if (!existing) {
      return { success: false, error: 'Staff member not found' };
    }

    const invalid = validateSchedule(schedule);
    if (invalid) {
      return { success: false, error: invalid };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Clear existing working hours & breaks
      await tx.staffBreak.deleteMany({
        where: {
          workingHours: { staffId },
        },
      });
      await tx.staffWorkingHours.deleteMany({
        where: { staffId },
      });

      // 2. Create enabled shifts
      for (const day of schedule) {
        if (day.enabled) {
          const shift = await tx.staffWorkingHours.create({
            data: {
              staffId,
              dayOfWeek: day.dayOfWeek,
              startTime: day.startTime,
              endTime: day.endTime,
            },
          });

          if (day.hasBreak && day.breakStartTime && day.breakEndTime) {
            await tx.staffBreak.create({
              data: {
                staffWorkingHoursId: shift.id,
                startTime: day.breakStartTime,
                endTime: day.breakEndTime,
              },
            });
          }
        }
      }
    });

    revalidatePath('/staff');
    revalidatePath('/users');
    revalidatePath('/schedules');
    revalidatePath('/availability');
    revalidatePath('/calendar');

    return { success: true };
  } catch (err) {
    return toActionError(err);
  }
}
