import { z } from 'zod';

export const intakeQuestionSchema = z.object({
  id: z.string(),
  label: z.string().min(1, 'Question label is required.'),
  type: z.enum(['TEXT', 'TEXTAREA', 'DROPDOWN', 'CHECKBOX']).default('TEXT'),
  placeholder: z.string().optional().nullable(),
  options: z.array(z.string()).optional().nullable(),
  required: z.boolean().default(false),
});

export type IntakeQuestion = z.infer<typeof intakeQuestionSchema>;

export const serviceAddonSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Add-on name is required.'),
  description: z.string().optional().nullable(),
  durationMinutes: z.coerce.number().int().min(0).default(0),
  price: z.coerce.number().min(0).default(0),
});

export type ServiceAddon = z.infer<typeof serviceAddonSchema>;

export const serviceFormSchema = z.object({
  name: z
    .string()
    .min(2, 'Service name must be at least 2 characters.')
    .max(100, 'Service name cannot exceed 100 characters.'),
  slug: z
    .string()
    .regex(/^[a-z0-9-]*$/, 'Slug can only contain lowercase letters, numbers, and hyphens.')
    .optional()
    .nullable()
    .or(z.literal('')),
  description: z
    .string()
    .max(1000, 'Description cannot exceed 1000 characters.')
    .optional()
    .nullable()
    .or(z.literal('')),
  categoryId: z
    .string()
    .uuid('Invalid category selected.')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (!val ? null : val)),
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
  price: z.coerce.number().min(0, 'Price cannot be negative.').default(0),
  currency: z.string().length(3, 'Currency must be a 3-letter code.').default('USD'),
  locationType: z
    .enum(['ONLINE_MEETING', 'IN_PERSON_BUSINESS', 'IN_PERSON_CUSTOMER', 'PHONE_CALL'])
    .default('ONLINE_MEETING'),
  locationDetails: z
    .string()
    .max(500, 'Location details cannot exceed 500 characters.')
    .optional()
    .nullable()
    .or(z.literal('')),
  isActive: z.boolean().default(true),
  hasYieldPricing: z.boolean().default(false),
  yieldDiscountPercent: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z
      .number()
      .int()
      .min(0, 'Discount must be at least 0%')
      .max(99, 'Discount cannot exceed 99%')
      .nullable()
      .optional()
  ),
  yieldDays: z.string().optional().nullable(),
  yieldStartTime: z.string().optional().nullable(),
  yieldEndTime: z.string().optional().nullable(),
  yieldLabel: z.string().max(50, 'Label cannot exceed 50 characters').optional().nullable(),
  intakeQuestions: z.array(intakeQuestionSchema).optional().nullable(),
  addons: z.array(serviceAddonSchema).optional().nullable(),
  routingStrategy: z
    .enum(['ANY_AVAILABLE', 'ROUND_ROBIN', 'CLIENT_CHOICE'])
    .default('ANY_AVAILABLE'),
  assignedStaffIds: z.array(z.string()).optional().default([]),
});

export type ServiceFormData = z.infer<typeof serviceFormSchema>;
