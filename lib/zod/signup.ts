import { z } from 'zod';

export const SIGNUP_ROLES = ['PROPERTY_MANAGER', 'LANDLORD', 'MANAGING_AGENT', 'OTHER'] as const;
export const SIGNUP_PORTFOLIO_SIZES = ['1-10', '11-50', '51-250', '250+'] as const;

export const signupRequestSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(120),
  email: z.string().trim().email('Enter a valid email').max(180),
  company: z.string().trim().min(2, 'Company name is required').max(160),
  role: z.enum(SIGNUP_ROLES),
  portfolioSize: z.enum(SIGNUP_PORTFOLIO_SIZES),
  message: z.string().trim().max(500).optional().or(z.literal('')),
  agree: z.literal(true, { message: 'You must accept the Terms and Privacy Policy' }),
});

export type SignupRequestInput = z.infer<typeof signupRequestSchema>;
