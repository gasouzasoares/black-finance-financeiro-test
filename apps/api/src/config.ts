import { z } from 'zod';
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLIC_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  JWT_ISSUER: z.url(),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
});
export type Config = z.infer<typeof schema>;
export function readConfig(env = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) throw new Error(`Configuração ausente/inválida: ${parsed.error.issues.map(i => i.path.join('.')).join(', ')}`);
  return parsed.data;
}
