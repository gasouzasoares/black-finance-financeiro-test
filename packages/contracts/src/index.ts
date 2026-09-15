import { z } from 'zod';

export const meSchema = z.object({
  id: z.uuid(), email: z.email(), display_name: z.string(),
  status: z.literal('active'),
});
export type Me = z.infer<typeof meSchema>;
export const publicConfigSchema = z.object({
  supabaseUrl: z.url(), supabasePublishableKey: z.string().min(1),
});
export const errorSchema = z.object({
  code: z.string(), message: z.string(), field_errors: z.record(z.string(), z.array(z.string())), request_id: z.string(),
});

export class AppError extends Error {
  constructor(public statusCode: number, public code: string, message: string,
    public fieldErrors: Record<string, string[]> = {}) { super(message); }
}
