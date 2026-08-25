'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@zoho-bookings/database';
import { z } from 'zod';

const staffSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional().nullable(),
  timezone: z.string().default('America/New_York'),
  isActive: z.boolean().default(true),
  assignedServiceIds: z.array(z.string()).default([]),
});

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
) {
  try {
    const validated = staffSchema.parse(rawData);

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
        timezone: validated.timezone || 'America/New_York',
        isActive: validated.isActive,
        serviceAssignments: {
          create: validated.assignedServiceIds.map((serviceId) => ({
            serviceId,
          })),
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
    revalidatePath('/availability');
    revalidatePath('/services');
    revalidatePath('/calendar');

    return {
      success: true,
      data: staff,
    };
  } catch (err: any) {
    console.error('Error creating staff:', err);
    return {
      success: false,
      error: err instanceof z.ZodError ? err.errors[0].message : err.message || 'Failed to create staff member',
    };
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
) {
  try {
    const validated = staffSchema.parse(rawData);

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
          serviceId: { notIn: validated.assignedServiceIds },
        },
      });

      // 3. Upsert assigned services
      for (const serviceId of validated.assignedServiceIds) {
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
    revalidatePath('/availability');
    revalidatePath('/services');
    revalidatePath('/calendar');

    return {
      success: true,
      data: updatedStaff,
    };
  } catch (err: any) {
    console.error('Error updating staff:', err);
    return {
      success: false,
      error: err instanceof z.ZodError ? err.errors[0].message : err.message || 'Failed to update staff member',
    };
  }
}

export async function toggleStaffStatusAction(workspaceId: string, staffId: string, isActive: boolean) {
  try {
    const updated = await prisma.staff.update({
      where: { id: staffId, workspaceId },
      data: { isActive },
    });

    revalidatePath('/staff');
    revalidatePath('/availability');
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update staff status' };
  }
}

export async function deleteStaffAction(workspaceId: string, staffId: string) {
  try {
    // Check if staff belongs to workspace
    const existing = await prisma.staff.findFirst({
      where: { id: staffId, workspaceId },
      include: { bookings: { select: { id: true, status: true } } },
    });

    if (!existing) {
      return { success: false, error: 'Staff member not found' };
    }

    const activeBookings = existing.bookings.filter(
      (b) => b.status === 'CONFIRMED' || b.status === 'PENDING'
    );

    if (activeBookings.length > 0) {
      return {
        success: false,
        error: `Cannot delete staff member with ${activeBookings.length} active scheduled appointments. Reassign or cancel those appointments first.`,
      };
    }

    // Delete staff member (cascades service assignments, working hours, etc.)
    await prisma.staff.delete({
      where: { id: staffId },
    });

    revalidatePath('/staff');
    revalidatePath('/availability');
    revalidatePath('/services');
    revalidatePath('/calendar');

    return { success: true };
  } catch (err: any) {
    console.error('Error deleting staff:', err);
    return { success: false, error: err.message || 'Failed to delete staff member' };
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

export async function updateStaffWorkingHoursAction(
  workspaceId: string,
  staffId: string,
  schedule: DayScheduleInput[]
) {
  try {
    const existing = await prisma.staff.findFirst({
      where: { id: staffId, workspaceId },
    });

    if (!existing) {
      return { success: false, error: 'Staff member not found' };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Clear existing working hours & breaks
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
    revalidatePath('/availability');

    return { success: true };
  } catch (err: any) {
    console.error('Error updating staff working hours:', err);
    return { success: false, error: err.message || 'Failed to update schedule' };
  }
}
