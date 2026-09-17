'use server';

import { prisma } from '@bookings/database';
import { localTimeToUtc } from '@bookings/core';
import { formatInTimeZone } from 'date-fns-tz';
import ExcelJS from 'exceljs';
import { z } from 'zod';
import { requireWorkspace, toActionError } from '@/lib/session';
import { EXPORTABLE_FIELDS, type FieldKey } from './fields';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const FIELD_KEYS = EXPORTABLE_FIELDS.map((f) => f.key) as [FieldKey, ...FieldKey[]];

const exportSchema = z.object({
  dateFrom: z.string().regex(DATE_PATTERN, 'Choose a start date.'),
  dateTo: z.string().regex(DATE_PATTERN, 'Choose an end date.'),
  fields: z.array(z.enum(FIELD_KEYS)).min(1, 'Select at least one field to export.'),
  format: z.enum(['csv', 'xlsx']),
  includeCustomFields: z.boolean().default(false),
});

export type ExportInput = z.input<typeof exportSchema>;

export interface ExportResult {
  success: boolean;
  error?: string;
  filename?: string;
  mimeType?: string;
  /** Base64-encoded file content; a data URL client-side triggers the download. */
  base64?: string;
  /** Set when the export succeeded but was capped below the actual row count. */
  warning?: string;
}

/**
 * Appointments only, matching the "Module" selector Zoho shows even though it
 * currently offers nothing else. Wired the same way once there's a second
 * exportable module, rather than reshaping this when that day comes.
 */
export async function exportAppointmentsAction(
  workspaceId: string,
  input: ExportInput
): Promise<ExportResult> {
  try {
    const { workspace } = await requireWorkspace(workspaceId, 'ADMIN');
    const data = exportSchema.parse(input);

    if (data.dateTo < data.dateFrom) {
      return { success: false, error: 'End date must be on or after the start date.' };
    }

    const tz = workspace.timezone || 'UTC';
    const from = localTimeToUtc(data.dateFrom, '00:00', tz);
    // Exclusive next-day boundary rather than "23:59", so a booking starting
    // in the last minute of the day is never dropped by rounding.
    const toDayStart = localTimeToUtc(data.dateTo, '00:00', tz);
    if (!from || !toDayStart) {
      return { success: false, error: 'Could not interpret the selected date range.' };
    }
    const to = new Date(toDayStart.getTime() + 24 * 60 * 60 * 1000);

    // A wide-open range on a workspace with years of history would otherwise
    // build an unbounded file in a single request.
    const MAX_ROWS = 50_000;
    const bookings = await prisma.booking.findMany({
      where: { workspaceId, startTime: { gte: from, lt: to } },
      include: { service: true, staff: true, customer: true },
      orderBy: { startTime: 'asc' },
      take: MAX_ROWS + 1,
    });
    const truncated = bookings.length > MAX_ROWS;
    const rows = truncated ? bookings.slice(0, MAX_ROWS) : bookings;

    const selectedFields = EXPORTABLE_FIELDS.filter((f) => data.fields.includes(f.key));

    // Intake responses are stored keyed by question id (see
    // BookingFlowClient's intake form state), not by label, and each service
    // defines its own questions independently. Resolving an id back to its
    // label needs that booking's own service's question list, so this maps
    // serviceId -> (questionId -> label) once and reuses it per row instead
    // of re-parsing the JSON for every booking on that service.
    const questionLabelsByService = new Map<string, Map<string, string>>();
    const labelsFor = (serviceId: string, questions: unknown): Map<string, string> => {
      let map = questionLabelsByService.get(serviceId);
      if (map) return map;
      map = new Map();
      for (const q of (questions as Array<{ id: string; label: string }>) || []) {
        if (q?.id && q.label) map.set(q.id, q.label);
      }
      questionLabelsByService.set(serviceId, map);
      return map;
    };

    // Custom fields are the intake question answers collected at booking
    // time. The export's column set is the union of every label actually
    // answered across the rows in range rather than a fixed list, since
    // different services ask different questions.
    const customFieldLabels: string[] = [];
    if (data.includeCustomFields) {
      const seen = new Set<string>();
      for (const booking of rows) {
        const responses = booking.intakeResponses as Record<string, unknown> | null;
        if (!responses) continue;
        const labels = labelsFor(booking.serviceId, booking.service.intakeQuestions);
        for (const questionId of Object.keys(responses)) {
          const label = labels.get(questionId) ?? questionId;
          if (!seen.has(label)) {
            seen.add(label);
            customFieldLabels.push(label);
          }
        }
      }
    }

    const fieldValue = (booking: (typeof rows)[number], key: FieldKey): string | number => {
      switch (key) {
        case 'bookingId':
          return booking.id;
        case 'startTime':
          return formatInTimeZone(booking.startTime, tz, 'yyyy-MM-dd HH:mm');
        case 'endTime':
          return formatInTimeZone(booking.endTime, tz, 'yyyy-MM-dd HH:mm');
        case 'service':
          return booking.service.name;
        case 'staff':
          return booking.staff.name;
        case 'customerName':
          return booking.customer.name;
        case 'customerEmail':
          return booking.customer.email;
        case 'customerPhone':
          return booking.customer.phone || '';
        case 'status':
          return booking.status;
        case 'source':
          return booking.source || '';
        case 'price':
          return booking.paidPrice ? Number(booking.paidPrice) : 0;
        case 'currency':
          return booking.paymentCurrency || workspace.currency || '';
        case 'paymentStatus':
          return booking.paymentStatus;
        case 'createdAt':
          return formatInTimeZone(booking.createdAt, tz, 'yyyy-MM-dd HH:mm');
      }
    };

    const header = [...selectedFields.map((f) => f.label), ...customFieldLabels];
    const sheetRows = rows.map((booking) => {
      const responses = (booking.intakeResponses as Record<string, unknown> | null) || {};
      const labels = labelsFor(booking.serviceId, booking.service.intakeQuestions);
      const answerByLabel = new Map<string, unknown>();
      for (const [questionId, value] of Object.entries(responses)) {
        answerByLabel.set(labels.get(questionId) ?? questionId, value);
      }
      const formatAnswer = (value: unknown): string =>
        typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value == null ? '' : String(value);
      return [
        ...selectedFields.map((f) => fieldValue(booking, f.key)),
        ...customFieldLabels.map((label) => formatAnswer(answerByLabel.get(label))),
      ];
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Appointments');
    worksheet.addRow(header);
    for (const row of sheetRows) worksheet.addRow(row);

    const fileBuffer =
      data.format === 'csv' ? await workbook.csv.writeBuffer() : await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(fileBuffer).toString('base64');

    const stamp = formatInTimeZone(new Date(), tz, 'yyyy-MM-dd');
    const extension = data.format === 'csv' ? 'csv' : 'xlsx';
    const mimeType =
      data.format === 'csv'
        ? 'text/csv;charset=utf-8'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    return {
      success: true,
      filename: `RoomanBookings-Appointments-${stamp}.${extension}`,
      mimeType,
      base64: buffer,
      ...(truncated
        ? {
            warning: `Only the first ${MAX_ROWS.toLocaleString()} rows were included; narrow the date range for the rest.`,
          }
        : {}),
    };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0].message };
    }
    return toActionError(err);
  }
}
