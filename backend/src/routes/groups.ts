import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import prisma from '../lib/prisma';
import { 
  createGroupSchema, 
  updateGroupSchema, 
  groupParamsSchema,
  timeMidpointQuerySchema,
  type CreateGroupRequest,
  type UpdateGroupRequest,
  type GroupParams,
  type TimeMidpointQuery
} from '../schemas/groups';
import { gmapsClient, GMAPS_KEY } from '../lib/gmaps';
import { createCache, makeCacheKey } from '../lib/cache';

const router = Router();

// Cache for midpoint calculations (5 minutes TTL)
const midpointCache = createCache<any>(5 * 60 * 1000);

// Cache for time-based midpoint calculations (10 minutes TTL)
const timeMidpointCache = createCache<any>(10 * 60 * 1000);

// Cache for routes (5 minutes TTL)
const routesCache = createCache<any>(5 * 60 * 1000);

/**
 * @swagger
 * /groups:
 *   get:
 *     summary: List all groups for current user
 *     tags: [Groups]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of groups
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 groups:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Group'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /groups - List all groups for current user
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    
    const groups = await prisma.group.findMany({
      where: {
        members: {
          some: {
            userId: userId
          }
        }
      },
      include: {
        owner: {
          select: { id: true, email: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, email: true }
            }
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

    res.json({ groups });
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ 
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch groups' 
    });
  }
});

/**
 * @swagger
 * /groups:
 *   post:
 *     summary: Create a new group
 *     tags: [Groups]
 *     security:
 *       - cookieAuth: []
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
 *         description: Group created successfully
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
 */
// POST /groups - Create new group
router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = createGroupSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        errors: validation.error.errors
      });
      return;
    }

    const { name } = validation.data as CreateGroupRequest;
    const userId = req.user!.userId;

    const group = await prisma.group.create({
      data: {
        name,
        ownerId: userId,
        members: {
          create: {
            userId: userId
          }
        }
      },
      include: {
        owner: {
          select: { id: true, email: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, email: true }
            }
          }
        },
        _count: {
          select: { members: true }
        }
      }
    });

    res.status(201).json({ group });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to create group'
    });
  }
});

/**
 * @swagger
 * /groups/{id}:
 *   get:
 *     summary: Get group details with members
 *     tags: [Groups]
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
// GET /groups/:id - Get group details with members
router.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = groupParamsSchema.safeParse(req.params);
    if (!validation.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid group ID',
        errors: validation.error.errors
      });
      return;
    }

    const { id } = validation.data as GroupParams;

    // Allow any authenticated user to view group (needed for joining)
    const group = await prisma.group.findUnique({
      where: {
        id
      },
      include: {
        owner: {
          select: { id: true, email: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, email: true }
            }
          },
          orderBy: {
            id: 'asc'
          }
        }
      }
    });

    if (!group) {
      res.status(404).json({
        code: 'GROUP_NOT_FOUND',
        message: 'Group not found'
      });
      return;
    }

    res.json({ group });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch group'
    });
  }
});

/**
 * @swagger
 * /groups/{id}:
 *   patch:
 *     summary: Update group name (members can update)
 *     tags: [Groups]
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
// PATCH /groups/:id - Update group (owner only)
router.patch('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const paramsValidation = groupParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid group ID',
        errors: paramsValidation.error.errors
      });
      return;
    }

    const bodyValidation = updateGroupSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        errors: bodyValidation.error.errors
      });
      return;
    }

    const { id } = paramsValidation.data as GroupParams;
    const { name } = bodyValidation.data as UpdateGroupRequest;
    const userId = req.user!.userId;

    // Check if user is a member of the group
    const group = await prisma.group.findFirst({
      where: {
        id,
        members: {
          some: {
            userId: userId
          }
        }
      }
    });

    if (!group) {
      res.status(404).json({
        code: 'GROUP_NOT_FOUND',
        message: 'Group not found or you are not a member'
      });
      return;
    }

    const updatedGroup = await prisma.group.update({
      where: { id },
      data: { name },
      include: {
        owner: {
          select: { id: true, email: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, email: true }
            }
          }
        }
      }
    });

    res.json({ group: updatedGroup });
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to update group'
    });
  }
});

/**
 * @swagger
 * /groups/{id}:
 *   delete:
 *     summary: Delete group (owner only)
 *     tags: [Groups]
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
// DELETE /groups/:id - Delete group (owner only)
router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = groupParamsSchema.safeParse(req.params);
    if (!validation.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid group ID',
        errors: validation.error.errors
      });
      return;
    }

    const { id } = validation.data as GroupParams;
    const userId = req.user!.userId;

    // Check if user is the owner
    const group = await prisma.group.findFirst({
      where: {
        id,
        ownerId: userId
      }
    });

    if (!group) {
      res.status(404).json({
        code: 'GROUP_NOT_FOUND',
        message: 'Group not found or you are not the owner'
      });
      return;
    }

    await prisma.group.delete({
      where: { id }
    });

    res.json({
      message: 'Group deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to delete group'
    });
  }
});

/**
 * @swagger
 * /groups/{id}/midpoint:
 *   get:
 *     summary: Calculate geometric midpoint and nearby places
 *     tags: [Groups]
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
// GET /groups/:id/midpoint - Calculate midpoint and nearby places
router.get('/:id/midpoint', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = groupParamsSchema.safeParse(req.params);
    if (!validation.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid group ID',
        errors: validation.error.errors
      });
      return;
    }

    const { id } = validation.data as GroupParams;
    const userId = req.user!.userId;

    // Check if user has access to this group
    const group = await prisma.group.findFirst({
      where: {
        id,
        members: {
          some: {
            userId: userId
          }
        }
      },
      include: {
        members: {
          where: {
            AND: [
              { lat: { not: null } },
              { lng: { not: null } }
            ]
          },
          include: {
            user: true
          }
        }
      }
    });

    if (!group) {
      res.status(404).json({
        code: 'GROUP_NOT_FOUND',
        message: 'Group not found or access denied'
      });
      return;
    }

    if (group.members.length < 2) {
      res.status(400).json({
        code: 'INSUFFICIENT_LOCATIONS',
        message: 'At least 2 members must have set their locations'
      });
      return;
    }

    // Create cache key based on member locations and travel modes
    const locationData = group.members.map((m: any) => ({ 
      lat: m.lat, 
      lng: m.lng, 
      travelMode: m.travelMode || 'driving' 
    })).sort();
    const cacheKey = makeCacheKey('midpoint', { groupId: id, locations: locationData });
    
    // Check cache first
    const cached = midpointCache.get(cacheKey);
    if (cached) {
      res.json({ ...cached, cached: true });
      return;
    }

    // Calculate midpoint
    const totalLat = group.members.reduce((sum: number, member: any) => sum + (member.lat || 0), 0);
    const totalLng = group.members.reduce((sum: number, member: any) => sum + (member.lng || 0), 0);
    const midpoint = {
      lat: totalLat / group.members.length,
      lng: totalLng / group.members.length
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
      const travelTimePromises = group.members.map(async (member: any) => {
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
              userId: member.userId || 0, // Use 0 for offline members
              userEmail: member.user?.email || member.nickname || 'Unknown',
              travelMode: member.travelMode || 'driving',
              duration: leg.duration.text,
              durationValue: leg.duration.value, // in seconds
              distance: leg.distance.text,
              distanceValue: leg.distance.value // in meters
            };
          }
        } catch (error) {
          console.error(`Error calculating travel time for user ${member.userId}:`, error);
        }
        
        return {
          userId: member.userId,
          userEmail: member.user.email,
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
      member_count: group.members.length,
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
 * /groups/{id}/midpoint_by_time:
 *   get:
 *     summary: Calculate time-based optimal midpoint (minimize total or maximum travel time)
 *     tags: [Groups]
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
// GET /groups/:id/midpoint_by_time - Calculate time-based optimal midpoint
router.get('/:id/midpoint_by_time', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate group ID
    const paramsValidation = groupParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      res.status(422).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid group ID',
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

    const { id } = paramsValidation.data as GroupParams;
    const { objective } = queryValidation.data as TimeMidpointQuery;
    const userId = req.user!.userId;
    const forceRecalculate = req.query.forceRecalculate === 'true';

    // Check if user has access to this group
    const group = await prisma.group.findFirst({
      where: {
        id,
        members: {
          some: {
            userId: userId
          }
        }
      },
      include: {
        members: {
          where: {
            AND: [
              { lat: { not: null } },
              { lng: { not: null } }
            ]
          },
          include: {
            user: {
              select: {
                id: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!group) {
      res.status(404).json({
        code: 'GROUP_NOT_FOUND',
        message: 'Group not found or access denied'
      });
      return;
    }

    if (!group || !group.members || group.members.length < 2) {
      res.status(400).json({
        code: 'NOT_ENOUGH_MEMBERS',
        message: 'At least 2 members must have set their locations'
      });
      return;
    }

    // Generate cache key with member locations and travel modes
    const locationData = (group as any).members.map((m: any) => ({ 
      lat: m.lat, 
      lng: m.lng,
      travelMode: m.travelMode || 'driving' 
    })).sort((a: any, b: any) => {
      if (a.lat !== b.lat) return a.lat! - b.lat!;
      return a.lng! - b.lng!;
    });
    const cacheKey = makeCacheKey('midpoint_by_time', { groupId: id, objective, locations: locationData });
    
    console.log(`[Time Midpoint] Cache key for group ${id}, objective: ${objective}`);
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
    console.log(`[Time Midpoint] Group members:`, (group as any).members.map((m: any) => ({
      id: m.userId || m.nickname,
      lat: m.lat,
      lng: m.lng,
      travelMode: m.travelMode
    })));
    
    // Calculate geometric center as starting point
    const totalLat = (group as any).members.reduce((sum: number, m: any) => sum + (m.lat || 0), 0);
    const totalLng = (group as any).members.reduce((sum: number, m: any) => sum + (m.lng || 0), 0);
    let currentLat = totalLat / (group as any).members.length;
    let currentLng = totalLng / (group as any).members.length;
    
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
      
      for (const member of (group as any).members) {
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
            console.log(`[Time Midpoint] Member ${member.userId || member.nickname} (${memberMode}): ${Math.round(time / 60)} min`);
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
              console.log(`[Time Midpoint] Member ${member.userId || member.nickname} (fallback driving): ${Math.round(time / 60)} min`);
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
      
      if (!allSuccess || travelTimes.length !== (group as any).members.length) {
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
      const slowestMember = (group as any).members[maxTimeIdx];
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
    
    console.log(`[Time Midpoint] Calculating travel times for ${(group as any).members.length} members to ${candidates.length} destinations`);

    for (const member of (group as any).members) {
      try {
        let memberMode = member.travelMode || 'driving';
        console.log(`[Time Midpoint] Calling Distance Matrix for member ${member.userId || member.nickname} with mode: ${memberMode}`);
        
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
            console.log(`[Time Midpoint] Transit failed for member ${member.userId || member.nickname}, falling back to driving`);
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
          console.error(`Distance Matrix error for member ${member.userId || member.nickname}:`, result.data.status);
          // Add empty row for this member
          distanceMatrixResults.push({
            elements: destinations.map(() => ({ status: 'ZERO_RESULTS' }))
          });
        }
      } catch (error) {
        console.error(`Error calling Distance Matrix for member ${member.userId || member.nickname}:`, error);
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
    const candidateScores: Array<{
      candidate: any;
      score: number;
      totalTime: number;
      maxTime: number;
      memberTimes: Array<{ userId: number; userEmail: string; travelTime: number; distance: number }>;
    }> = [];
    
    let invalidCount = 0;

    for (let candIdx = 0; candIdx < candidates.length; candIdx++) {
      const memberTimes: Array<{ userId: number; userEmail: string; travelTime: number; distance: number }> = [];
      let totalTime = 0;
      let maxTime = 0;
      let hasInvalidData = false;

      for (let memberIdx = 0; memberIdx < (group as any).members.length; memberIdx++) {
        const element = distanceMatrixResults[memberIdx].elements[candIdx];
        
        if (element.status !== 'OK' || !element.duration) {
          console.log(`[Time Midpoint] Invalid route: member ${memberIdx} to candidate ${candIdx} - status: ${element.status}`);
          hasInvalidData = true;
          break;
        }

        const travelTime = element.duration.value; // seconds
        const distance = element.distance.value; // meters

        memberTimes.push({
          userId: (group as any).members[memberIdx].userId || 0, // Use 0 for offline members
          userEmail: (group as any).members[memberIdx].user?.email || (group as any).members[memberIdx].nickname || 'Unknown',
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
      const member = (group as any).members[idx];
      console.log(`  - ${mt.userEmail} (${member.travelMode}): ${Math.round(mt.travelTime / 60)} min, ${(mt.distance / 1000).toFixed(1)} km`);
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
 * /groups/{id}/routes_to_midpoint:
 *   get:
 *     summary: Get routes from all members to the midpoint
 *     tags: [Groups]
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
// GET /groups/:id/routes_to_midpoint - Get routes from members to midpoint
router.get('/:id/routes_to_midpoint', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate group ID
    const paramsValidation = groupParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      res.status(422).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid group ID',
        errors: paramsValidation.error.errors
      });
      return;
    }

    const { id } = paramsValidation.data as GroupParams;
    const userId = req.user!.userId;
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
    const cacheKey = makeCacheKey('routes', { groupId: id, midpointLat, midpointLng });
    const cached = routesCache.get(cacheKey);
    if (cached) {
      res.json({ ...cached, cached: true });
      return;
    }

    // Check if user has access to this group
    const group = await prisma.group.findFirst({
      where: {
        id,
        members: {
          some: {
            userId: userId
          }
        }
      },
      include: {
        members: {
          where: {
            AND: [
              { lat: { not: null } },
              { lng: { not: null } }
            ]
          },
          include: {
            user: {
              select: {
                id: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!group) {
      res.status(404).json({
        code: 'GROUP_NOT_FOUND',
        message: 'Group not found or access denied'
      });
      return;
    }

    // Calculate routes for each member
    const routes: Array<{
      memberId: number;
      memberEmail: string;
      polyline: string;
      duration: number;
      distance: number;
    }> = [];

    for (const member of (group as any).members) {
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
            memberId: member.userId || 0, // Use 0 for offline members
            memberEmail: member.user?.email || member.nickname || 'Unknown',
            polyline: route.overview_polyline.points,
            duration: leg.duration.value,
            distance: leg.distance.value
          });
        }
      } catch (error) {
        console.error(`Error calculating route for member ${member.userId}:`, error);
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

export default router;


