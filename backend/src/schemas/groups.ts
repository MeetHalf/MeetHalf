import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100, 'Group name must be less than 100 characters'),
});

export const updateGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100, 'Group name must be less than 100 characters'),
});

export const groupParamsSchema = z.object({
  id: z.coerce.number().int().positive('Group ID must be a positive integer'),
});

export const timeMidpointQuerySchema = z.object({
  objective: z.enum(['minimize_total', 'minimize_max']).default('minimize_total')
});

export type CreateGroupRequest = z.infer<typeof createGroupSchema>;
export type UpdateGroupRequest = z.infer<typeof updateGroupSchema>;
export type GroupParams = z.infer<typeof groupParamsSchema>;
export type TimeMidpointQuery = z.infer<typeof timeMidpointQuerySchema>;
