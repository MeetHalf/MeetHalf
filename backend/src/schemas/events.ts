import { z } from 'zod';

export const createEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(100, 'Event name must be less than 100 characters'),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  useMeetHalf: z.boolean().optional().default(false),
  meetingPointLat: z.number().optional().nullable(),
  meetingPointLng: z.number().optional().nullable(),
  meetingPointName: z.string().optional().nullable(),
  meetingPointAddress: z.string().optional().nullable(),
});

export const updateEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(100, 'Event name must be less than 100 characters'),
});

export const eventParamsSchema = z.object({
  id: z.coerce.number().int().positive('Event ID must be a positive integer'),
});

export const timeMidpointQuerySchema = z.object({
  objective: z.enum(['minimize_total', 'minimize_max']).default('minimize_total')
});

export type CreateEventRequest = z.infer<typeof createEventSchema>;
export type UpdateEventRequest = z.infer<typeof updateEventSchema>;
export type EventParams = z.infer<typeof eventParamsSchema>;
export type TimeMidpointQuery = z.infer<typeof timeMidpointQuerySchema>;

