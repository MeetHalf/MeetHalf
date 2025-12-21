import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').optional(),
  avatar: z.string().url('Invalid avatar URL').optional().nullable(),
  defaultLat: z.number().min(-90).max(90).optional().nullable(),
  defaultLng: z.number().min(-180).max(180).optional().nullable(),
  defaultAddress: z.string().max(500).optional().nullable(),
  defaultLocationName: z.string().max(200).optional().nullable(),
});

export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>;

