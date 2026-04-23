import { z } from 'zod';

export const contactRequestSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(120),
  email: z.string().trim().email('Enter a valid email').max(180),
  subject: z.string().trim().min(2, 'Subject is required').max(160),
  message: z.string().trim().min(5, 'Please include a short message').max(2000),
});

export type ContactRequestInput = z.infer<typeof contactRequestSchema>;
