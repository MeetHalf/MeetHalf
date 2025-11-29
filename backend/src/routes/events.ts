import { Router, Request, Response } from 'express';
import { optionalAuthMiddleware } from '../middleware/auth';
import prisma from '../lib/prisma';
import { getUserName, getUserUserId, getAnonymousUserId } from '../lib/userUtils';
import { 
  createEventSchema, 
  updateEventSchema, 
  eventParamsSchema,
  timeMidpointQuerySchema,
  type CreateEventRequest,
  type UpdateEventRequest,
  type EventParams,
  type TimeMidpointQuery
} from '../schemas/events';
import {
  joinEventSchema,
  updateLocationSchema,
  pokeMemberSchema,
  myEventsQuerySchema,
  type JoinEventRequest,
  type UpdateLocationRequest,
  type PokeMemberRequest,
  type MyEventsQuery,
} from '../schemas/eventActions';
import { gmapsClient, GMAPS_KEY } from '../lib/gmaps';
import { createCache, makeCacheKey } from '../lib/cache';
import { memberService } from '../services/MemberService';
import { pokeService } from '../services/PokeService';
import { eventService } from '../services/EventService';
import { eventRepository } from '../repositories/EventRepository';
import { memberRepository } from '../repositories/MemberRepository';
import { generateGuestToken } from '../utils/jwt';

const router = Router();

// Cache for midpoint calculations (5 minutes TTL)
const midpointCache = createCache<any>(5 * 60 * 1000);

// Cache for time-based midpoint calculations (10 minutes TTL)
const timeMidpointCache = createCache<any>(10 * 60 * 1000);

// Cache for routes (5 minutes TTL)
const routesCache = createCache<any>(5 * 60 * 1000);

/**
 * @swagger
 * /events:
 *   get:
 *     summary: List all events for current user (or empty array for anonymous users)
 *     tags: [Events]
 *     responses:
 *       200:
 *         description: List of events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 events:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Event'
 */
// GET /events - List all events for current user (supports anonymous)
router.get('/', optionalAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    // If user is authenticated, filter by userId
    if (req.user && 'userId' in req.user) {
      const jwtPayload = req.user as { userId: number };
      const userUserId = await getUserUserId(jwtPayload.userId);
      
      if (!userUserId) {
        res.json({ events: [] });
        return;
      }
      
      const events = await prisma.event.findMany({
        where: {
          members: {
            some: {
              userId: userUserId
            }
          }
        },
        include: {
          members: {
            orderBy: {
              id: 'asc'
            }
          },
          _count: {
            select: { members: true }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json({ events });
    } else {
      // Anonymous user - return empty array (events are separate for anonymous users)
      res.json({ events: [] });
    }
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ 
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch events' 
    });
  }
});

/**
 * @swagger
 * /events:
 *   post:
 *     summary: Create a new event (supports anonymous users)
 *     tags: [Events]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Weekend Meetup"
 *     responses:
 *       201:
 *         description: Event created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 event:
 *                   $ref: '#/components/schemas/Event'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /events - Create new event (supports anonymous users)
router.post('/', optionalAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = createEventSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        errors: validation.error.errors
      });
      return;
    }

    const { name, startTime, endTime } = validation.data as CreateEventRequest;
    
    // Determine owner name - use authenticated user's name or anonymous identifier
    let ownerName: string;
    let memberUserId: string | null = null;
    if (req.user && 'userId' in req.user) {
      const jwtPayload = req.user as { userId: number };
      ownerName = await getUserName(jwtPayload.userId);
      memberUserId = await getUserUserId(jwtPayload.userId);
    } else {
      // Anonymous user - generate a session-based identifier
      const sessionId = req.headers['x-session-id'] as string || req.cookies.sessionId || '';
      ownerName = getAnonymousUserId(sessionId);
      memberUserId = ownerName; // For anonymous, use the same identifier
    }

    const event = await prisma.event.create({
      data: {
        name,
        ownerName,
        startTime,
        endTime,
        members: {
          create: {
            userId: memberUserId
          }
        }
      },
      include: {
        members: {
          orderBy: {
            id: 'asc'
          }
        },
        _count: {
          select: { members: true }
        }
      }
    });

    res.status(201).json({ event });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to create event'
    });
  }
});

/**
 * @swagger
 * /events/{id}:
 *   get:
 *     summary: Get group details with members
 *     tags: [Events]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Group ID
 *     responses:
 *       200:
 *         description: Group details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 group:
 *                   $ref: '#/components/schemas/Group'
 *       400:
 *         description: Invalid group ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Group not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /events/:id - Get event details with members (public access)
router.get('/:id', optionalAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = eventParamsSchema.safeParse(req.params);
    if (!validation.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid event ID',
        errors: validation.error.errors
      });
      return;
    }

    const { id } = validation.data as EventParams;

    // Allow public access to view event (needed for joining)
    const event = await prisma.event.findUnique({
      where: {
        id
      },
      include: {
        members: {
          orderBy: {
            id: 'asc'
          }
        },
        _count: {
          select: { members: true }
        }
      }
    });

    if (!event) {
      res.status(404).json({
        code: 'EVENT_NOT_FOUND',
        message: 'Event not found'
      });
      return;
    }

    res.json({ event });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch event'
    });
  }
});

/**
 * @swagger
 * /events/{id}:
 *   patch:
 *     summary: Update group name (members can update)
 *     tags: [Events]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Group ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "Updated Group Name"
 *     responses:
 *       200:
 *         description: Group updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 group:
 *                   $ref: '#/components/schemas/Group'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Group not found or user is not a member
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// PATCH /events/:id - Update event (owner or members can update)
router.patch('/:id', optionalAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const paramsValidation = eventParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid event ID',
        errors: paramsValidation.error.errors
      });
      return;
    }

    const bodyValidation = updateEventSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        errors: bodyValidation.error.errors
      });
      return;
    }

    const { id } = paramsValidation.data as EventParams;
    const { name } = bodyValidation.data as UpdateEventRequest;
    
    // Get current user's userId and name (or use anonymous identifier)
    let userUserId: string | null = null;
    let userName: string | null = null;
    if (req.user && 'userId' in req.user) {
      const jwtPayload = req.user as { userId: number };
      userUserId = await getUserUserId(jwtPayload.userId);
      userName = await getUserName(jwtPayload.userId);
    }

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        members: true
      }
    });

    if (!event) {
      res.status(404).json({
        code: 'EVENT_NOT_FOUND',
        message: 'Event not found'
      });
      return;
    }

    // Check if user is the owner (by ownerName match) or a member (by userId match)
    if (userName && userUserId && (event.ownerName === userName || event.members.some(m => m.userId === userUserId))) {
      const updatedEvent = await prisma.event.update({
        where: { id },
        data: { name },
        include: {
          members: {
            orderBy: {
              id: 'asc'
            }
          },
          _count: {
            select: { members: true }
          }
        }
      });

      res.json({ event: updatedEvent });
    } else {
      res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Only event owner or members can update the event'
      });
    }
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to update event'
    });
  }
});

/**
 * @swagger
 * /events/{id}:
 *   delete:
 *     summary: Delete group (owner only)
 *     tags: [Events]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Group ID
 *     responses:
 *       200:
 *         description: Group deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Only group owner can delete
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Group not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// DELETE /events/:id - Delete group (owner only)
router.delete('/:id', optionalAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = eventParamsSchema.safeParse(req.params);
    if (!validation.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid event ID',
        errors: validation.error.errors
      });
      return;
    }

    const { id } = validation.data as EventParams;
    
    // Get current user's name (must be authenticated for delete)
    if (!req.user || !('userId' in req.user)) {
      res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required to delete events'
      });
      return;
    }
    
    const jwtPayload = req.user as { userId: number };
    const userName = await getUserName(jwtPayload.userId);

    // Check if event exists and user is the owner
    const event = await prisma.event.findUnique({
      where: { id }
    });

    if (!event) {
      res.status(404).json({
        code: 'EVENT_NOT_FOUND',
        message: 'Event not found'
      });
      return;
    }

    if (event.ownerName !== userName) {
      res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Only event owner can delete the event'
      });
      return;
    }

    await prisma.event.delete({
      where: { id }
    });

    res.json({
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to delete event'
    });
  }
});

/**
 * @swagger
 * /events/{id}/midpoint:
 *   get:
 *     summary: Calculate geometric midpoint and nearby places
 *     tags: [Events]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Group ID
 *     responses:
 *       200:
 *         description: Midpoint calculation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 midpoint:
 *                   type: object
 *                   properties:
 *                     lat:
 *                       type: number
 *                     lng:
 *                       type: number
 *                 address:
 *                   type: string
 *                 suggested_places:
 *                   type: array
 *                   items:
 *                     type: object
 *                 member_travel_times:
 *                   type: array
 *                   items:
 *                     type: object
 *                 cached:
 *                   type: boolean
 *       400:
 *         description: Insufficient locations or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Group not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /events/:id/midpoint - Calculate midpoint and nearby places
router.get('/:id/midpoint', optionalAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = eventParamsSchema.safeParse(req.params);
    if (!validation.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid event ID',
        errors: validation.error.errors
      });
      return;
    }

    const { id } = validation.data as EventParams;
    
    // Get current user's name (optional - public access for midpoint calculation)
    let userName: string | null = null;
    if (req.user && 'userId' in req.user) {
      userName = await getUserName((req.user as { userId: number }).userId);
    }

    // Get event - public access, no membership check needed for viewing midpoint
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        members: {
          where: {
            AND: [
              { lat: { not: null } },
              { lng: { not: null } }
            ]
          },
          orderBy: {
            id: 'asc'
          }
        }
      }
    });

    if (!event) {
      res.status(404).json({
        code: 'EVENT_NOT_FOUND',
        message: 'Event not found'
      });
      return;
    }

    if (event.members.length < 2) {
      res.status(400).json({
        code: 'INSUFFICIENT_LOCATIONS',
        message: 'At least 2 members must have set their locations'
      });
      return;
    }

    // Create cache key based on member locations and travel modes
    const locationData = event.members.map((m: any) => ({ 
      lat: m.lat, 
      lng: m.lng, 
      travelMode: m.travelMode || 'driving' 
    })).sort();
    const cacheKey = makeCacheKey('midpoint', { eventId: id, locations: locationData });
    
    // Check cache first
    const cached = midpointCache.get(cacheKey);
    if (cached) {
      res.json({ ...cached, cached: true });
      return;
    }

    // Calculate midpoint
    const totalLat = event.members.reduce((sum: number, member: any) => sum + (member.lat || 0), 0);
    const totalLng = event.members.reduce((sum: number, member: any) => sum + (member.lng || 0), 0);
    const midpoint = {
      lat: totalLat / event.members.length,
      lng: totalLng / event.members.length
    };

    // Get address for midpoint using reverse geocoding
    let address = 'Unknown location';
    let suggestedPlaces: any[] = [];
    let memberTravelTimes: any[] = [];

    try {
      // Reverse geocode the midpoint
      const reverseResult = await gmapsClient.reverseGeocode({
        params: {
          latlng: `${midpoint.lat},${midpoint.lng}`,
          key: GMAPS_KEY
        }
      });

      if (reverseResult.data.status === 'OK' && reverseResult.data.results.length > 0) {
        address = reverseResult.data.results[0].formatted_address;
      }

      // Calculate travel times for each member to the midpoint
      const travelTimePromises = event.members.map(async (member: any) => {
        try {
          const directionsResult = await gmapsClient.directions({
            params: {
              origin: `${member.lat},${member.lng}`,
              destination: `${midpoint.lat},${midpoint.lng}`,
              mode: member.travelMode || 'driving',
              key: GMAPS_KEY
            }
          });

          if (directionsResult.data.status === 'OK' && directionsResult.data.routes.length > 0) {
            const route = directionsResult.data.routes[0];
            const leg = route.legs[0];
            return {
              username: member.userId || member.nickname || 'Unknown',
              memberId: member.id,
              travelMode: member.travelMode || 'driving',
              duration: leg.duration.text,
              durationValue: leg.duration.value, // in seconds
              distance: leg.distance.text,
              distanceValue: leg.distance.value // in meters
            };
          }
        } catch (error) {
          console.error(`Error calculating travel time for member ${member.id}:`, error);
        }
        
        return {
          username: member.userId || member.nickname || 'Unknown',
          memberId: member.id,
          travelMode: member.travelMode || 'driving',
          duration: '無法計算',
          durationValue: null,
          distance: '無法計算',
          distanceValue: null
        };
      });

      memberTravelTimes = await Promise.all(travelTimePromises);

      // Find nearby places
      const nearbyResult = await gmapsClient.placesNearby({
        params: {
          location: `${midpoint.lat},${midpoint.lng}`,
          radius: 1500,
          type: 'restaurant',
          key: GMAPS_KEY
        }
      });

      if (nearbyResult.data.status === 'OK') {
        suggestedPlaces = nearbyResult.data.results.slice(0, 3).map(place => ({
          name: place.name,
          address: place.vicinity,
          rating: place.rating,
          types: place.types,
          place_id: place.place_id
        }));
      }
    } catch (error) {
      console.error('Error calling Google Maps API:', error);
      // Continue with basic midpoint data even if Maps API fails
    }

    const result = {
      midpoint,
      address,
      suggested_places: suggestedPlaces,
      member_travel_times: memberTravelTimes,
      member_count: event.members.length,
      cached: false
    };

    // Cache the result
    midpointCache.set(cacheKey, result);

    res.json(result);
  } catch (error) {
    console.error('Error calculating midpoint:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to calculate midpoint'
    });
  }
});

/**
 * @swagger
 * /events/{id}/midpoint_by_time:
 *   get:
 *     summary: Calculate time-based optimal midpoint (minimize total or maximum travel time)
 *     tags: [Events]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Group ID
 *       - in: query
 *         name: objective
 *         required: false
 *         schema:
 *           type: string
 *           enum: [minimize_total, minimize_max]
 *           default: minimize_total
 *         description: Optimization objective - minimize total travel time or maximum travel time
 *       - in: query
 *         name: forceRecalculate
 *         required: false
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Force recalculation and bypass cache
 *     responses:
 *       200:
 *         description: Time-based midpoint calculation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 midpoint:
 *                   type: object
 *                   properties:
 *                     lat:
 *                       type: number
 *                     lng:
 *                       type: number
 *                 address:
 *                   type: string
 *                 total_travel_time:
 *                   type: integer
 *                 max_travel_time:
 *                   type: integer
 *                 member_travel_times:
 *                   type: array
 *                   items:
 *                     type: object
 *                 suggested_places:
 *                   type: array
 *                   items:
 *                     type: object
 *                 cached:
 *                   type: boolean
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Group not found or insufficient member locations
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /events/:id/midpoint_by_time - Calculate time-based optimal midpoint
router.get('/:id/midpoint_by_time', optionalAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate group ID
    const paramsValidation = eventParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      res.status(422).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid event ID',
        errors: paramsValidation.error.errors
      });
      return;
    }

    // Validate query params
    const queryValidation = timeMidpointQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      res.status(422).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
        errors: queryValidation.error.errors
      });
      return;
    }

    const { id } = paramsValidation.data as EventParams;
    const { objective } = queryValidation.data as TimeMidpointQuery;
    const forceRecalculate = req.query.forceRecalculate === 'true';

    // Get event - public access for midpoint calculation
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        members: {
          where: {
            AND: [
              { lat: { not: null } },
              { lng: { not: null } }
            ]
          },
          orderBy: {
            id: 'asc'
          }
        }
      }
    });

    if (!event) {
      res.status(404).json({
        code: 'EVENT_NOT_FOUND',
        message: 'Event not found'
      });
      return;
    }

    if (!event || !event.members || event.members.length < 2) {
      res.status(400).json({
        code: 'NOT_ENOUGH_MEMBERS',
        message: 'At least 2 members must have set their locations'
      });
      return;
    }

    // Generate cache key with member locations and travel modes
    const locationData = event.members.map((m: any) => ({ 
      lat: m.lat, 
      lng: m.lng,
      travelMode: m.travelMode || 'driving' 
    })).sort((a: any, b: any) => {
      if (a.lat !== b.lat) return a.lat! - b.lat!;
      return a.lng! - b.lng!;
    });
    const cacheKey = makeCacheKey('midpoint_by_time', { eventId: id, objective, locations: locationData });
    
    console.log(`[Time Midpoint] Cache key for event ${id}, objective: ${objective}`);
    console.log(`[Time Midpoint] Member locations:`, locationData);
    console.log(`[Time Midpoint] Force recalculate: ${forceRecalculate}`);
    
    // Check cache (skip if forceRecalculate is true)
    if (!forceRecalculate) {
      const cached = timeMidpointCache.get(cacheKey);
      if (cached) {
        console.log(`[Time Midpoint] Returning cached result`);
        res.json({ ...cached, cached: true });
        return;
      }
    } else {
      console.log(`[Time Midpoint] Skipping cache due to forceRecalculate flag`);
    }
    
    console.log(`[Time Midpoint] Cache miss, calculating new midpoint`);

    // Step 3: Use iterative optimization starting from geometric center
    console.log(`[Time Midpoint] Starting iterative optimization from geometric center`);
    console.log(`[Time Midpoint] Event members:`, event.members.map((m: any) => ({
      id: m.id,
      username: m.userId || m.nickname,
      lat: m.lat,
      lng: m.lng,
      travelMode: m.travelMode
    })));
    
    // Calculate geometric center as starting point
    const totalLat = event.members.reduce((sum: number, m: any) => sum + (m.lat || 0), 0);
    const totalLng = event.members.reduce((sum: number, m: any) => sum + (m.lng || 0), 0);
    let currentLat = totalLat / event.members.length;
    let currentLng = totalLng / event.members.length;
    
    console.log(`[Time Midpoint] Initial center: ${currentLat}, ${currentLng}`);
    
    // Iterative optimization (max 5 iterations)
    const maxIterations = 5;
    const moveDistance = 0.005; // approximately 500 meters
    let bestLocation = { lat: currentLat, lng: currentLng };
    let bestMaxTime = Infinity;
    
    for (let iter = 0; iter < maxIterations; iter++) {
      console.log(`[Time Midpoint] Iteration ${iter + 1}: Testing point ${currentLat}, ${currentLng}`);
      
      // Calculate travel time from each member to current point
      const travelTimes: number[] = [];
      let allSuccess = true;
      
      for (const member of event.members) {
        try {
          const memberMode = member.travelMode || 'driving';
          const result = await gmapsClient.distancematrix({
            params: {
              origins: [`${member.lat},${member.lng}`],
              destinations: [`${currentLat},${currentLng}`],
              mode: memberMode as any,
              key: GMAPS_KEY
            }
          });
          
          if (result.data.status === 'OK' && result.data.rows[0].elements[0].status === 'OK') {
            const time = result.data.rows[0].elements[0].duration.value;
            travelTimes.push(time);
            console.log(`[Time Midpoint] Member ${member.userId || member.nickname || member.id} (${memberMode}): ${Math.round(time / 60)} min`);
          } else if (memberMode === 'transit') {
            // Fallback to driving for transit
            const fallbackResult = await gmapsClient.distancematrix({
              params: {
                origins: [`${member.lat},${member.lng}`],
                destinations: [`${currentLat},${currentLng}`],
                mode: 'driving' as any,
                key: GMAPS_KEY
              }
            });
            if (fallbackResult.data.status === 'OK' && fallbackResult.data.rows[0].elements[0].status === 'OK') {
              const time = fallbackResult.data.rows[0].elements[0].duration.value;
              travelTimes.push(time);
              console.log(`[Time Midpoint] Member ${member.userId || member.nickname || member.id} (fallback driving): ${Math.round(time / 60)} min`);
            } else {
              allSuccess = false;
              break;
            }
          } else {
            allSuccess = false;
            break;
          }
        } catch (error) {
          console.error(`[Time Midpoint] Error calculating time for member:`, error);
          allSuccess = false;
          break;
        }
      }
      
      if (!allSuccess || travelTimes.length !== event.members.length) {
        console.log(`[Time Midpoint] Failed to calculate all travel times at iteration ${iter + 1}`);
        break;
      }
      
      // Calculate max time for this point
      const maxTime = Math.max(...travelTimes);
      const maxTimeIdx = travelTimes.indexOf(maxTime);
      
      console.log(`[Time Midpoint] Max time: ${Math.round(maxTime / 60)} min (member ${maxTimeIdx})`);
      
      // Update best location if this is better
      if (objective === 'minimize_max' && maxTime < bestMaxTime) {
        bestMaxTime = maxTime;
        bestLocation = { lat: currentLat, lng: currentLng };
        console.log(`[Time Midpoint] New best location found!`);
      } else if (objective === 'minimize_total') {
        const totalTime = travelTimes.reduce((a, b) => a + b, 0);
        if (totalTime < bestMaxTime) {
          bestMaxTime = totalTime;
          bestLocation = { lat: currentLat, lng: currentLng };
          console.log(`[Time Midpoint] New best location found with total time: ${Math.round(totalTime / 60)} min`);
        }
      }
      
      // Move towards the member with longest travel time
      const slowestMember = event.members[maxTimeIdx];
      const latDiff = slowestMember.lat! - currentLat;
      const lngDiff = slowestMember.lng! - currentLng;
      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
      
      if (distance < moveDistance) {
        console.log(`[Time Midpoint] Converged! Distance to slowest member < threshold`);
        break;
      }
      
      // Move towards slowest member
      currentLat += (latDiff / distance) * moveDistance;
      currentLng += (lngDiff / distance) * moveDistance;
    }
    
    console.log(`[Time Midpoint] Optimization complete. Best location: ${bestLocation.lat}, ${bestLocation.lng}`);
    
    // Step 4: Find nearest actual place (cafe, restaurant, etc.) to the optimized point
    const candidatesMap = new Map<string, any>();
    
    try {
      console.log(`[Time Midpoint] Searching for places near optimized point`);
      const nearbyResult = await gmapsClient.placesNearby({
        params: {
          location: `${bestLocation.lat},${bestLocation.lng}`,
          radius: 1000,
          type: 'cafe',
          key: GMAPS_KEY
        }
      });

      if (nearbyResult.data.status === 'OK' && nearbyResult.data.results) {
        for (const place of nearbyResult.data.results) {
          if (place.place_id && place.name && place.geometry?.location) {
            candidatesMap.set(place.place_id, {
              place_id: place.place_id,
              name: place.name,
              lat: place.geometry.location.lat,
              lng: place.geometry.location.lng,
              address: place.vicinity || place.formatted_address || ''
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching places near optimized point:`, error);
    }

    const candidates = Array.from(candidatesMap.values()).slice(0, 20);
    
    console.log(`[Time Midpoint] Found ${candidates.length} candidates near optimized point`);

    if (candidates.length === 0) {
      console.error('[Time Midpoint] No candidates found!');
      res.status(500).json({
        code: 'NO_CANDIDATES',
        message: '無法在最佳位置附近找到適合的會面地點'
      });
      return;
    }

    // Step 5: Calculate final travel times to candidate places using Distance Matrix
    // Call API for each member with their own travel mode
    const destinations = candidates.map(c => `${c.lat},${c.lng}`);
    const distanceMatrixResults: any[] = [];
    
    console.log(`[Time Midpoint] Calculating travel times for ${event.members.length} members to ${candidates.length} destinations`);

    for (const member of event.members) {
      try {
        let memberMode = member.travelMode || 'driving';
        console.log(`[Time Midpoint] Calling Distance Matrix for member ${member.userId || member.nickname || member.id} with mode: ${memberMode}`);
        
        let result = await gmapsClient.distancematrix({
          params: {
            origins: [`${member.lat},${member.lng}`],
            destinations,
            mode: memberMode as any,
            key: GMAPS_KEY
          }
        });
        
        // If transit fails, try driving as fallback
        if (result.data.status === 'OK') {
          const hasValidRoutes = result.data.rows[0].elements.some((e: any) => e.status === 'OK');
          if (!hasValidRoutes && memberMode === 'transit') {
            console.log(`[Time Midpoint] Transit failed for member ${member.userId || member.nickname || member.id}, falling back to driving`);
            result = await gmapsClient.distancematrix({
              params: {
                origins: [`${member.lat},${member.lng}`],
                destinations,
                mode: 'driving' as any,
                key: GMAPS_KEY
              }
            });
          }
          distanceMatrixResults.push(result.data.rows[0]);
        } else {
          console.error(`Distance Matrix error for member ${member.userId || member.nickname || member.id}:`, result.data.status);
          // Add empty row for this member
          distanceMatrixResults.push({
            elements: destinations.map(() => ({ status: 'ZERO_RESULTS' }))
          });
        }
      } catch (error) {
        console.error(`Error calling Distance Matrix for member ${member.userId || member.nickname || member.id}:`, error);
        // Add empty row for this member
        distanceMatrixResults.push({
          elements: destinations.map(() => ({ status: 'ZERO_RESULTS' }))
        });
      }
    }

    if (distanceMatrixResults.length === 0) {
      res.status(500).json({
        code: 'DISTANCE_MATRIX_ERROR',
        message: 'Failed to calculate travel times'
      });
      return;
    }

    // Step 6: Score candidates
    type MemberTime = {
      memberId: number;
      username: string; // Keep as username for response (can be userId or nickname)
      travelTime: number;
      distance: number;
    };
    
    const candidateScores: Array<{
      candidate: any;
      score: number;
      totalTime: number;
      maxTime: number;
      memberTimes: MemberTime[];
    }> = [];
    
    let invalidCount = 0;

    for (let candIdx = 0; candIdx < candidates.length; candIdx++) {
      const memberTimes: MemberTime[] = [];
      let totalTime = 0;
      let maxTime = 0;
      let hasInvalidData = false;

      for (let memberIdx = 0; memberIdx < event.members.length; memberIdx++) {
        const element = distanceMatrixResults[memberIdx].elements[candIdx];
        
        if (element.status !== 'OK' || !element.duration) {
          console.log(`[Time Midpoint] Invalid route: member ${memberIdx} to candidate ${candIdx} - status: ${element.status}`);
          hasInvalidData = true;
          break;
        }

        const travelTime = element.duration.value; // seconds
        const distance = element.distance.value; // meters
        const member = event.members[memberIdx];

        memberTimes.push({
          memberId: member.id,
          username: member.userId || member.nickname || 'Unknown',
          travelTime,
          distance
        });

        totalTime += travelTime;
        maxTime = Math.max(maxTime, travelTime);
      }

      if (!hasInvalidData) {
        const score = objective === 'minimize_total' ? totalTime : maxTime;
        candidateScores.push({
          candidate: candidates[candIdx],
          score,
          totalTime,
          maxTime,
          memberTimes
        });
      } else {
        invalidCount++;
      }
    }
    
    console.log(`[Time Midpoint] Valid candidates: ${candidateScores.length}, Invalid: ${invalidCount}`);

    if (candidateScores.length === 0) {
      console.error(`[Time Midpoint] No valid routes found! Checked ${candidates.length} candidates, all failed.`);
      res.status(500).json({
        code: 'NO_VALID_ROUTES',
        message: `無法計算到任何候選地點的路線。可能原因：1) 距離太遠 2) 選擇的交通方式不可行（例如某地點無法搭乘大眾運輸到達）。建議：請嘗試更改成員的交通方式設定，或確保所有成員的位置設定正確。`
      });
      return;
    }

    // Step 7: Select best candidate
    candidateScores.sort((a, b) => a.score - b.score);
    const best = candidateScores[0];

    console.log(`[Time Midpoint] ===== FINAL RESULT =====`);
    console.log(`[Time Midpoint] Objective: ${objective}`);
    console.log(`[Time Midpoint] Best location: ${best.candidate.name} (${best.candidate.lat}, ${best.candidate.lng})`);
    console.log(`[Time Midpoint] Total time: ${Math.round(best.totalTime / 60)} min`);
    console.log(`[Time Midpoint] Max time: ${Math.round(best.maxTime / 60)} min`);
    console.log(`[Time Midpoint] Individual member times:`);
    best.memberTimes.forEach((mt, idx) => {
      const member = event.members[idx];
      console.log(`  - ${mt.username} (${member.travelMode || 'driving'}): ${Math.round(mt.travelTime / 60)} min, ${(mt.distance / 1000).toFixed(1)} km`);
    });
    console.log(`[Time Midpoint] =======================`);

    // Step 8: Format response
    const result = {
      midpoint: {
        name: best.candidate.name,
        lat: best.candidate.lat,
        lng: best.candidate.lng,
        address: best.candidate.address,
        place_id: best.candidate.place_id
      },
      metric: {
        total: best.totalTime,
        max: best.maxTime
      },
      members: best.memberTimes,
      candidates_count: candidates.length,
      cached: false
    };

    // Step 8: Cache result
    timeMidpointCache.set(cacheKey, result);

    res.json(result);
  } catch (error) {
    console.error('Error calculating time-based midpoint:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to calculate time-based midpoint'
    });
  }
});

/**
 * @swagger
 * /events/{id}/routes_to_midpoint:
 *   get:
 *     summary: Get routes from all members to the midpoint
 *     tags: [Events]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Group ID
 *       - in: query
 *         name: midpointLat
 *         required: true
 *         schema:
 *           type: number
 *           format: float
 *         description: Midpoint latitude
 *       - in: query
 *         name: midpointLng
 *         required: true
 *         schema:
 *           type: number
 *           format: float
 *         description: Midpoint longitude
 *     responses:
 *       200:
 *         description: Routes calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 routes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       memberId:
 *                         type: integer
 *                       memberEmail:
 *                         type: string
 *                       polyline:
 *                         type: string
 *                         description: Encoded polyline string for map rendering
 *                       duration:
 *                         type: integer
 *                         description: Duration in seconds
 *                       distance:
 *                         type: integer
 *                         description: Distance in meters
 *                 cached:
 *                   type: boolean
 *       422:
 *         description: Validation error (missing midpointLat or midpointLng)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Group not found or access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /events/:id/routes_to_midpoint - Get routes from members to midpoint
router.get('/:id/routes_to_midpoint', optionalAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate group ID
    const paramsValidation = eventParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      res.status(422).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid event ID',
        errors: paramsValidation.error.errors
      });
      return;
    }

    const { id } = paramsValidation.data as EventParams;
    const { midpointLat, midpointLng } = req.query;

    // Validate required query params
    if (!midpointLat || !midpointLng) {
      res.status(422).json({
        code: 'VALIDATION_ERROR',
        message: 'midpointLat and midpointLng are required'
      });
      return;
    }

    // Check cache first
    const cacheKey = makeCacheKey('routes', { eventId: id, midpointLat, midpointLng });
    const cached = routesCache.get(cacheKey);
    if (cached) {
      res.json({ ...cached, cached: true });
      return;
    }

    // Get event - public access
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        members: {
          where: {
            AND: [
              { lat: { not: null } },
              { lng: { not: null } }
            ]
          },
          orderBy: {
            id: 'asc'
          }
        }
      }
    });

    if (!event) {
      res.status(404).json({
        code: 'EVENT_NOT_FOUND',
        message: 'Event not found'
      });
      return;
    }

    // Calculate routes for each member
    const routes: Array<{
      memberId: number;
      username: string;
      polyline: string;
      duration: number;
      distance: number;
    }> = [];

    for (const member of event.members) {
      try {
        const directionsResult = await gmapsClient.directions({
          params: {
            origin: `${member.lat},${member.lng}`,
            destination: `${midpointLat},${midpointLng}`,
            mode: (member.travelMode || 'driving') as any,
            key: GMAPS_KEY
          }
        });

        if (directionsResult.data.status === 'OK' && directionsResult.data.routes.length > 0) {
          const route = directionsResult.data.routes[0];
          const leg = route.legs[0];
          
          routes.push({
            memberId: member.id,
            username: member.userId || member.nickname || 'Unknown',
            polyline: route.overview_polyline.points,
            duration: leg.duration.value,
            distance: leg.distance.value
          });
        }
      } catch (error) {
        console.error(`Error calculating route for member ${member.id}:`, error);
      }
    }

    const result = {
      routes,
      cached: false
    };

    // Cache the result
    routesCache.set(cacheKey, result);

    res.json(result);
  } catch (error) {
    console.error('Error calculating routes:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to calculate routes'
    });
  }
});

/**
 * @swagger
 * /events/{id}/join:
 *   post:
 *     summary: Join event as guest (no authentication required)
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nickname
 *             properties:
 *               nickname:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "訪客小美"
 *               shareLocation:
 *                 type: boolean
 *                 default: false
 *               travelMode:
 *                 type: string
 *                 enum: [driving, transit, walking, bicycling]
 *                 default: driving
 *     responses:
 *       201:
 *         description: Successfully joined event
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 member:
 *                   $ref: '#/components/schemas/Member'
 *                 guestToken:
 *                   type: string
 *                   description: JWT token for guest authentication
 *       400:
 *         description: Validation error
 *       404:
 *         description: Event not found
 */
// POST /events/:id/join - Join event as guest
router.post('/:id/join', optionalAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const paramsValidation = eventParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid event ID',
        errors: paramsValidation.error.errors,
      });
      return;
    }

    const bodyValidation = joinEventSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        errors: bodyValidation.error.errors,
      });
      return;
    }

    const { id } = paramsValidation.data as EventParams;

    const member = await memberService.joinEventAsGuest(id, bodyValidation.data);

    // Generate guest token
    const guestToken = generateGuestToken(member.id, id);

    res.status(201).json({
      member,
      guestToken,
    });
  } catch (error: any) {
    console.error('Error joining event:', error);
    if (error.message === 'Event not found') {
      res.status(404).json({
        code: 'EVENT_NOT_FOUND',
        message: error.message,
      });
    } else {
      res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'Failed to join event',
      });
    }
  }
});

/**
 * @swagger
 * /events/{id}/location:
 *   post:
 *     summary: Update member location (within time window only)
 *     tags: [Events]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lat
 *               - lng
 *             properties:
 *               lat:
 *                 type: number
 *                 format: float
 *               lng:
 *                 type: number
 *                 format: float
 *               address:
 *                 type: string
 *               travelMode:
 *                 type: string
 *                 enum: [driving, transit, walking, bicycling]
 *     responses:
 *       200:
 *         description: Location updated successfully
 *       400:
 *         description: Validation error or outside time window
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Member not found
 */
// POST /events/:id/location - Update member location
router.post('/:id/location', optionalAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const paramsValidation = eventParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid event ID',
        errors: paramsValidation.error.errors,
      });
      return;
    }

    const bodyValidation = updateLocationSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        errors: bodyValidation.error.errors,
      });
      return;
    }

    const { id } = paramsValidation.data as EventParams;

    // Get member ID from auth (JWT or guest token)
    let memberId: number | null = null;
    if (req.user && 'userId' in req.user) {
      // Authenticated user - find their member record
      const jwtPayload = req.user as { userId: number };
      const userUserId = await getUserUserId(jwtPayload.userId);
      if (userUserId) {
        const { memberRepository } = await import('../repositories/MemberRepository');
        const member = await memberRepository.findByEventIdAndUserId(id, userUserId);
        if (member) {
          memberId = member.id;
        }
      }
    } else if (req.user && 'memberId' in req.user) {
      // Guest token
      memberId = (req.user as { memberId: number }).memberId;
    }

    if (!memberId) {
      res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      return;
    }

    const updatedMember = await memberService.updateLocation(memberId, bodyValidation.data);

    res.json({ member: updatedMember });
  } catch (error: any) {
    console.error('Error updating location:', error);
    if (error.message === 'Member not found' || error.message === 'Event not found') {
      res.status(404).json({
        code: 'NOT_FOUND',
        message: error.message,
      });
    } else if (error.message.includes('time window')) {
      res.status(400).json({
        code: 'OUTSIDE_TIME_WINDOW',
        message: error.message,
      });
    } else {
      res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'Failed to update location',
      });
    }
  }
});

/**
 * @swagger
 * /events/{id}/arrival:
 *   post:
 *     summary: Mark member arrival
 *     tags: [Events]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Arrival marked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 arrivalTime:
 *                   type: string
 *                   format: date-time
 *                 status:
 *                   type: string
 *                   enum: [early, ontime, late]
 *                 lateMinutes:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Member not found
 */
// POST /events/:id/arrival - Mark member arrival
router.post('/:id/arrival', optionalAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const paramsValidation = eventParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid event ID',
        errors: paramsValidation.error.errors,
      });
      return;
    }

    const { id } = paramsValidation.data as EventParams;

    // Get member ID from auth
    let memberId: number | null = null;
    if (req.user && 'userId' in req.user) {
      const jwtPayload = req.user as { userId: number };
      const userUserId = await getUserUserId(jwtPayload.userId);
      if (userUserId) {
        const { memberRepository } = await import('../repositories/MemberRepository');
        const member = await memberRepository.findByEventIdAndUserId(id, userUserId);
        if (member) {
          memberId = member.id;
        }
      }
    } else if (req.user && 'memberId' in req.user) {
      memberId = (req.user as { memberId: number }).memberId;
    }

    if (!memberId) {
      res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      return;
    }

    const result = await memberService.markArrival(memberId);

    res.json(result);
  } catch (error: any) {
    console.error('Error marking arrival:', error);
    if (error.message === 'Member not found' || error.message === 'Event not found') {
      res.status(404).json({
        code: 'NOT_FOUND',
        message: error.message,
      });
    } else {
      res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'Failed to mark arrival',
      });
    }
  }
});

/**
 * @swagger
 * /events/{id}/poke:
 *   post:
 *     summary: Poke a member (max 3 times per pair)
 *     tags: [Events]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - targetMemberId
 *             properties:
 *               targetMemberId:
 *                 type: integer
 *                 description: ID of the member to poke
 *     responses:
 *       200:
 *         description: Poke successful
 *       400:
 *         description: Validation error or poke limit exceeded
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Member not found
 */
// POST /events/:id/poke - Poke a member
router.post('/:id/poke', optionalAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const paramsValidation = eventParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid event ID',
        errors: paramsValidation.error.errors,
      });
      return;
    }

    const bodyValidation = pokeMemberSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        errors: bodyValidation.error.errors,
      });
      return;
    }

    const { id } = paramsValidation.data as EventParams;
    const { targetMemberId } = bodyValidation.data;

    // Get current member ID from auth
    let fromMemberId: number | null = null;
    if (req.user && 'userId' in req.user) {
      const jwtPayload = req.user as { userId: number };
      const userUserId = await getUserUserId(jwtPayload.userId);
      if (userUserId) {
        const { memberRepository } = await import('../repositories/MemberRepository');
        const member = await memberRepository.findByEventIdAndUserId(id, userUserId);
        if (member) {
          fromMemberId = member.id;
        }
      }
    } else if (req.user && 'memberId' in req.user) {
      fromMemberId = (req.user as { memberId: number }).memberId;
    }

    if (!fromMemberId) {
      res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      return;
    }

    const result = await pokeService.pokeMember(id, fromMemberId, targetMemberId);

    res.json(result);
  } catch (error: any) {
    console.error('Error poking member:', error);
    if (error.message === 'Member not found') {
      res.status(404).json({
        code: 'NOT_FOUND',
        message: error.message,
      });
    } else if (error.message.includes('limit') || error.message.includes('Cannot poke yourself')) {
      res.status(400).json({
        code: 'BAD_REQUEST',
        message: error.message,
      });
    } else {
      res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'Failed to poke member',
      });
    }
  }
});

/**
 * @swagger
 * /events/{id}/pokes:
 *   get:
 *     summary: Get poke statistics for an event
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Poke statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mostPoked:
 *                   type: object
 *                   properties:
 *                     nickname:
 *                       type: string
 *                     count:
 *                       type: integer
 *                 mostPoker:
 *                   type: object
 *                   properties:
 *                     nickname:
 *                       type: string
 *                     count:
 *                       type: integer
 *                 totalPokes:
 *                   type: integer
 *       404:
 *         description: Event not found
 */
// GET /events/:id/pokes - Get poke statistics
router.get('/:id/pokes', optionalAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const paramsValidation = eventParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid event ID',
        errors: paramsValidation.error.errors,
      });
      return;
    }

    const { id } = paramsValidation.data as EventParams;
    const stats = await pokeService.getPokeStats(id);

    res.json(stats);
  } catch (error: any) {
    console.error('Error getting poke stats:', error);
    if (error.message === 'Event not found') {
      res.status(404).json({
        code: 'NOT_FOUND',
        message: error.message,
      });
    } else {
      res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'Failed to get poke statistics',
      });
    }
  }
});

/**
 * @swagger
 * /events/{id}/result:
 *   get:
 *     summary: Get event result (rankings) - public endpoint
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event result with rankings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 eventId:
 *                   type: integer
 *                 rankings:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       memberId:
 *                         type: integer
 *                       nickname:
 *                         type: string
 *                       arrivalTime:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       status:
 *                         type: string
 *                         enum: [early, ontime, late, absent]
 *                       lateMinutes:
 *                         type: integer
 *                         nullable: true
 *                       rank:
 *                         type: integer
 *                         nullable: true
 *                       pokeCount:
 *                         type: integer
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalMembers:
 *                       type: integer
 *                     arrivedCount:
 *                       type: integer
 *                     lateCount:
 *                       type: integer
 *                     absentCount:
 *                       type: integer
 *       404:
 *         description: Event not found
 */
// GET /events/:id/result - Get event result (rankings)
router.get('/:id/result', optionalAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const paramsValidation = eventParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid event ID',
        errors: paramsValidation.error.errors,
      });
      return;
    }

    const { id } = paramsValidation.data as EventParams;
    const result = await eventService.getEventResult(id);

    res.json({ result });
  } catch (error: any) {
    console.error('Error getting event result:', error);
    if (error.message === 'Event not found') {
      res.status(404).json({
        code: 'NOT_FOUND',
        message: error.message,
      });
    } else {
      res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'Failed to get event result',
      });
    }
  }
});

/**
 * @swagger
 * /events/my-events:
 *   get:
 *     summary: Get my events list (requires authentication)
 *     tags: [Events]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [upcoming, ongoing, ended, all]
 *           default: all
 *         description: Filter by status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Number of events to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of events to skip
 *     responses:
 *       200:
 *         description: List of events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 events:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Event'
 *                 total:
 *                   type: integer
 *                 hasMore:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 */
// GET /events/my-events - Get my events list
router.get('/my-events', optionalAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !('userId' in req.user)) {
      res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      return;
    }

    const queryValidation = myEventsQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
        errors: queryValidation.error.errors,
      });
      return;
    }

    const jwtPayload = req.user as { userId: number };
    const userUserId = await getUserUserId(jwtPayload.userId);

    if (!userUserId) {
      res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'User not found',
      });
      return;
    }

    const { status, limit, offset } = queryValidation.data;

    const events = await eventRepository.findByUserId(userUserId, { status, limit, offset });
    const total = await eventRepository.countByUserId(userUserId, status);
    const hasMore = offset + limit < total;

    res.json({
      events,
      total,
      hasMore,
    });
  } catch (error) {
    console.error('Error fetching my events:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch events',
    });
  }
});

export default router;


