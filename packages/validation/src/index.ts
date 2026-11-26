import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().trim().max(120).optional(),
});

export const gstinSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format');

export const decimalMoneySchema = z
  .string()
  .regex(/^-?\d+(\.\d{1,4})?$/, 'Monetary value must be a valid decimal string');

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
