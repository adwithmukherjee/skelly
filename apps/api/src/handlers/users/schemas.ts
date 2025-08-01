import { z } from 'zod';

/**
 * Common user schemas that can be reused across handlers
 */

// Base user schema matching the database fields
// Note: The actual fields should match your database schema
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  role: z.enum(['user', 'admin', 'moderator']),
  passwordHash: z.string(),
  isEmailVerified: z.boolean(),
  isActive: z.boolean(),
  lastLoginAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Public user schema (without sensitive fields like passwordHash)
export const publicUserSchema = userSchema.omit({
  passwordHash: true,
});

// Type exports
export type User = z.infer<typeof userSchema>;
export type PublicUser = z.infer<typeof publicUserSchema>;