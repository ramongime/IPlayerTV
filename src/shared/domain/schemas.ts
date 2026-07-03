import { z } from 'zod';

export const accountInputSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
  server: z.string().trim().url('Server deve ser uma URL válida, ex: https://servidor.com:443'),
  username: z.string().trim().min(1, 'Username é obrigatório'),
  password: z.string().min(1, 'Password é obrigatório'),
  output: z.enum(['m3u8', 'ts']),
  player: z.enum(['vlc', 'mpv', 'browser', 'internal']),
  userAgent: z.string().trim().optional()
});

export const accountUpdateSchema = accountInputSchema.partial();

export type AccountInput = z.infer<typeof accountInputSchema>;
export type AccountUpdateInput = z.infer<typeof accountUpdateSchema>;
