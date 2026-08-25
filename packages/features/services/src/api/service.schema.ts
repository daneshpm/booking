import { z } from 'zod';

export const serviceFormSchema = z.object({
  name: z
    .string()
    .min(2, 'Service name must be at least 2 characters.')
    .max(100, 'Service name cannot exceed 100 characters.'),
  slug: z
    .string()
    .regex(/^[a-z0-9-]*$/, 'Slug can only contain lowercase letters, numbers, and hyphens.')
    .optional(),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters.').optional(),
  categoryId: z.string().uuid('Invalid category selected.').optional().or(z.literal('')),
  durationMinutes: z.coerce
    .number()
    .int('Duration must be a whole number of minutes.')
    .min(5, 'Duration must be at least 5 minutes.')
    .max(1440, 'Duration cannot exceed 24 hours (1440 minutes).'),
  bufferBeforeMinutes: z.coerce
    .number()
    .int()
    .min(0, 'Buffer before cannot be negative.')
    .max(180, 'Buffer before cannot exceed 180 minutes.')
    .default(0),
  bufferAfterMinutes: z.coerce
    .number()
    .int()
    .min(0, 'Buffer after cannot be negative.')
    .max(180, 'Buffer after cannot exceed 180 minutes.')
    .default(0),
  price: z.coerce
    .number()
    .min(0, 'Price cannot be negative.')
    .default(0),
  currency: z.string().length(3, 'Currency must be a 3-letter code.').default('USD'),
  locationType: z.enum(['ONLINE_MEETING', 'IN_PERSON_BUSINESS', 'IN_PERSON_CUSTOMER', 'PHONE_CALL']).default('ONLINE_MEETING'),
  locationDetails: z.string().max(500, 'Location details cannot exceed 500 characters.').optional(),
  isActive: z.boolean().default(true),
});

export type ServiceFormData = z.infer<typeof serviceFormSchema>;
