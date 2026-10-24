import { z } from 'zod';

export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export interface BookingPageActionResult {
  success: boolean;
  error?: string;
}

export const brandingSchema = z.object({
  brandColor: z
    .string()
    .trim()
    .regex(HEX_COLOR_PATTERN, 'Enter a valid hex color, e.g. #5c34ad.')
    .optional()
    .nullable(),
  bookingWelcomeTitle: z.string().trim().max(120).optional().nullable(),
  bookingWelcomeMessage: z.string().trim().max(300).optional().nullable(),
});

export type BrandingInput = z.input<typeof brandingSchema>;

export const routingOptionSchema = z.object({
  serviceId: z.string().trim().min(1),
  label: z.string().trim().min(1, 'Give every option a label.').max(120),
});

export const routingFormSchema = z
  .object({
    question: z.string().trim().min(1, 'Give the routing question some text.').max(200),
    isEnabled: z.boolean().default(false),
    options: z.array(routingOptionSchema).max(20),
  })
  .refine((data) => !data.isEnabled || data.options.length > 0, {
    message: 'Add at least one option before turning the routing form on.',
    path: ['options'],
  });

export type RoutingFormInput = z.input<typeof routingFormSchema>;

export interface RoutingFormActionResult extends BookingPageActionResult {
  fieldErrors?: Record<string, string[]>;
}
