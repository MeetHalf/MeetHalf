import { z } from 'zod';

// Helper function to validate and parse dates
const dateSchema = z.union([
  z.string().refine(
    (val) => {
      const date = new Date(val);
      return !isNaN(date.getTime());
    },
    { message: 'Invalid date format. Use ISO 8601 format (e.g., 2025-12-01T19:00:00Z)' }
  ).transform((val) => new Date(val)),
  z.coerce.date({ invalid_type_error: 'Invalid date format' })
]);

export const createEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(100, 'Event name must be less than 100 characters'),
  startTime: dateSchema,
  endTime: dateSchema,
  ownerId: z.string().min(1, 'Owner ID is required'),
  useMeetHalf: z.boolean().default(false),
  status: z.enum(['upcoming', 'ongoing', 'ended']).optional(),
  meetingPointLat: z.number().optional().nullable(),
  meetingPointLng: z.number().optional().nullable(),
  meetingPointName: z.string().optional().nullable(),
  meetingPointAddress: z.string().optional().nullable(),
  groupId: z.number().int().positive().optional().nullable(),
}).refine(
  (data) => data.endTime > data.startTime,
  {
    message: 'endTime must be after startTime',
    path: ['endTime'],
  }
);

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

