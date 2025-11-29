import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import prisma from '../lib/prisma';
import { 
  addMemberSchema, 
  updateMemberLocationSchema, 
  memberParamsSchema,
  createOfflineMemberSchema,
  updateOfflineMemberSchema,
  type AddMemberRequest,
  type UpdateMemberLocationRequest,
  type MemberParams,
  type CreateOfflineMemberRequest,
  type UpdateOfflineMemberRequest
} from '../schemas/members';

const router = Router();

/**
 * @swagger
 * /members:
 *   post:
 *     summary: Add member to group (join group or add another user)
 *     tags: [Members]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - groupId
 *             properties:
 *               userId:
 *                 type: integer
 *                 description: User ID to add (can be current user to join group)
 *               groupId:
 *                 type: integer
 *                 description: Group ID
 *               lat:
 *                 type: number
 *                 format: float
 *                 minimum: -90
 *                 maximum: 90
 *                 description: Latitude (optional)
 *               lng:
 *                 type: number
 *                 format: float
 *                 minimum: -180
 *                 maximum: 180
 *                 description: Longitude (optional)
 *               address:
 *                 type: string
 *                 maxLength: 255
 *                 description: Address (optional)
 *               travelMode:
 *                 type: string
 *                 enum: [driving, transit, walking, bicycling]
 *                 description: Travel mode (optional)
 *     responses:
 *       201:
 *         description: Member added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 member:
 *                   $ref: '#/components/schemas/Member'
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
 *         description: Forbidden - Cannot add others if not a member
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Target user not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: User is already a member
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /members - Add member to group
router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = addMemberSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        errors: validation.error.errors
      });
      return;
    }

    const { userId: targetUserId, groupId, lat, lng, address, travelMode } = validation.data as AddMemberRequest;
    const currentUserId = req.user!.userId;

    // If user is adding themselves, allow it (joining the group)
    // If user is adding someone else, check if they're already a member
    if (targetUserId !== currentUserId) {
      const userMembership = await prisma.member.findFirst({
        where: {
          userId: currentUserId,
          groupId: groupId
        }
      });

      if (!userMembership) {
        res.status(403).json({
          code: 'FORBIDDEN',
          message: 'You are not a member of this group and cannot add others.'
        });
        return;
      }
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (!targetUser) {
      res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: 'Target user not found'
      });
      return;
    }

    // Check if user is already a member
    const existingMember = await prisma.member.findFirst({
      where: {
        userId: targetUserId,
        groupId: groupId
      }
    });

    if (existingMember) {
      res.status(409).json({
        code: 'MEMBER_EXISTS',
        message: 'User is already a member of this group'
      });
      return;
    }

    // Add the member
    const member = await prisma.member.create({
      data: {
        userId: targetUserId,
        groupId: groupId,
        lat,
        lng,
        address,
        travelMode: travelMode || 'driving'
      },
      include: {
        user: {
          select: { id: true, email: true }
        },
        group: {
          select: { id: true, name: true }
        }
      }
    });

    res.status(201).json({ member });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to add member'
    });
  }
});

/**
 * @swagger
 * /members/{id}:
 *   patch:
 *     summary: Update member location and travel mode (own location only)
 *     tags: [Members]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Member ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lat:
 *                 type: number
 *                 format: float
 *                 minimum: -90
 *                 maximum: 90
 *                 description: Latitude (optional)
 *               lng:
 *                 type: number
 *                 format: float
 *                 minimum: -180
 *                 maximum: 180
 *                 description: Longitude (optional)
 *               address:
 *                 type: string
 *                 maxLength: 255
 *                 description: Address (optional)
 *               travelMode:
 *                 type: string
 *                 enum: [driving, transit, walking, bicycling]
 *                 description: Travel mode (optional)
 *     responses:
 *       200:
 *         description: Member location updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 member:
 *                   $ref: '#/components/schemas/Member'
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
 *         description: Member not found or you can only update your own location
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// PATCH /members/:id - Update member location
router.patch('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const paramsValidation = memberParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid member ID',
        errors: paramsValidation.error.errors
      });
      return;
    }

    const bodyValidation = updateMemberLocationSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        errors: bodyValidation.error.errors
      });
      return;
    }

    const { id } = paramsValidation.data as MemberParams;
    const { lat, lng, address, travelMode } = bodyValidation.data as UpdateMemberLocationRequest;
    const userId = req.user!.userId;

    // Check if the member exists and belongs to the current user
    const member = await prisma.member.findFirst({
      where: {
        id,
        userId: userId
      }
    });

    if (!member) {
      res.status(404).json({
        code: 'MEMBER_NOT_FOUND',
        message: 'Member not found or you can only update your own location'
      });
      return;
    }

    // Update the member location and travel mode
    const updatedMember = await prisma.member.update({
      where: { id },
      data: {
        lat,
        lng,
        address,
        travelMode,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: { id: true, email: true }
        },
        group: {
          select: { id: true, name: true }
        }
      }
    });

    res.json({ member: updatedMember });
  } catch (error) {
    console.error('Error updating member location:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to update member location'
    });
  }
});

/**
 * @swagger
 * /members/{id}:
 *   delete:
 *     summary: Remove member from group (self or group owner)
 *     tags: [Members]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Member ID
 *     responses:
 *       200:
 *         description: Member removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error or owner cannot leave while other members exist
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
 *         description: Forbidden - Can only remove yourself or must be group owner
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Member not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// DELETE /members/:id - Remove member from group
router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = memberParamsSchema.safeParse(req.params);
    if (!validation.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid member ID',
        errors: validation.error.errors
      });
      return;
    }

    const { id } = validation.data as MemberParams;
    const userId = req.user!.userId;

    // Find the member and check permissions
    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        group: {
          select: { ownerId: true }
        }
      }
    });

    if (!member) {
      res.status(404).json({
        code: 'MEMBER_NOT_FOUND',
        message: 'Member not found'
      });
      return;
    }

    // Check if user can remove this member:
    // 1. User is removing themselves, OR
    // 2. User is the group owner
    const canRemove = member.userId === userId || member.group.ownerId === userId;

    if (!canRemove) {
      res.status(403).json({
        code: 'ACCESS_DENIED',
        message: 'You can only remove yourself or you must be the group owner'
      });
      return;
    }

    // Check if this is the group owner trying to leave their own group
    if (member.userId === userId && member.group.ownerId === userId) {
      // Count other members
      const memberCount = await prisma.member.count({
        where: {
          groupId: member.groupId,
          userId: { not: userId }
        }
      });

      if (memberCount > 0) {
        res.status(400).json({
          code: 'OWNER_CANNOT_LEAVE',
          message: 'Group owner cannot leave while other members exist. Transfer ownership or delete the group.'
        });
        return;
      }
    }

    await prisma.member.delete({
      where: { id }
    });

    res.json({
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to remove member'
    });
  }
});

/**
 * @swagger
 * /members/offline:
 *   post:
 *     summary: Create offline member (non-registered user)
 *     tags: [Members]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupId
 *               - nickname
 *               - lat
 *               - lng
 *             properties:
 *               groupId:
 *                 type: integer
 *                 description: Group ID
 *               nickname:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Display name for offline member
 *               lat:
 *                 type: number
 *                 format: float
 *                 minimum: -90
 *                 maximum: 90
 *                 description: Latitude
 *               lng:
 *                 type: number
 *                 format: float
 *                 minimum: -180
 *                 maximum: 180
 *                 description: Longitude
 *               address:
 *                 type: string
 *                 maxLength: 255
 *                 description: Address (optional)
 *               travelMode:
 *                 type: string
 *                 enum: [driving, transit, walking, bicycling]
 *                 default: driving
 *                 description: Travel mode
 *     responses:
 *       201:
 *         description: Offline member created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 member:
 *                   $ref: '#/components/schemas/Member'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Must be a member of the group
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// ✅ NEW: POST /members/offline - Create offline member
router.post('/offline', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = createOfflineMemberSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(422).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        errors: validation.error.errors
      });
      return;
    }

    const { groupId, nickname, lat, lng, address, travelMode } = validation.data;
    const userId = req.user!.userId;

    // Check if user is a member of this group
    const membership = await prisma.member.findFirst({
      where: {
        groupId,
        userId
      }
    });

    if (!membership) {
      res.status(403).json({
        code: 'FORBIDDEN',
        message: 'You must be a member of this group to add offline members'
      });
      return;
    }

    // Create offline member
    const offlineMember = await prisma.member.create({
      data: {
        groupId,
        nickname,
        lat,
        lng,
        address,
        travelMode,
        isOffline: true,
        userId: null
      }
    });

    res.status(201).json({ member: offlineMember });
  } catch (error) {
    console.error('Error creating offline member:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to create offline member'
    });
  }
});

/**
 * @swagger
 * /members/offline/{id}:
 *   patch:
 *     summary: Update offline member (group members can edit)
 *     tags: [Members]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Offline member ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nickname:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Display name (optional)
 *               lat:
 *                 type: number
 *                 format: float
 *                 minimum: -90
 *                 maximum: 90
 *                 description: Latitude (optional)
 *               lng:
 *                 type: number
 *                 format: float
 *                 minimum: -180
 *                 maximum: 180
 *                 description: Longitude (optional)
 *               address:
 *                 type: string
 *                 maxLength: 255
 *                 description: Address (optional)
 *               travelMode:
 *                 type: string
 *                 enum: [driving, transit, walking, bicycling]
 *                 description: Travel mode (optional)
 *     responses:
 *       200:
 *         description: Offline member updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 member:
 *                   $ref: '#/components/schemas/Member'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Must be a member of the group
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Offline member not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// ✅ NEW: PATCH /members/offline/:id - Update offline member
router.patch('/offline/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const memberIdValidation = memberParamsSchema.safeParse(req.params);
    if (!memberIdValidation.success) {
      res.status(422).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid member ID',
        errors: memberIdValidation.error.errors
      });
      return;
    }

    const bodyValidation = updateOfflineMemberSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      res.status(422).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        errors: bodyValidation.error.errors
      });
      return;
    }

    const { id } = memberIdValidation.data;
    const userId = req.user!.userId;

    // Check if this is an offline member and user has permission
    const member = await prisma.member.findUnique({
      where: { id },
      include: { group: true }
    });

    if (!member || !member.isOffline) {
      res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Offline member not found'
      });
      return;
    }

    // Check if user is a member of the same group
    const userMembership = await prisma.member.findFirst({
      where: {
        groupId: member.groupId,
        userId
      }
    });

    if (!userMembership) {
      res.status(403).json({
        code: 'FORBIDDEN',
        message: 'You must be a member of this group to edit offline members'
      });
      return;
    }

    // Update offline member
    const updatedMember = await prisma.member.update({
      where: { id },
      data: bodyValidation.data
    });

    res.json({ member: updatedMember });
  } catch (error) {
    console.error('Error updating offline member:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to update offline member'
    });
  }
});

/**
 * @swagger
 * /members/offline/{id}:
 *   delete:
 *     summary: Delete offline member (group members can delete)
 *     tags: [Members]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Offline member ID
 *     responses:
 *       200:
 *         description: Offline member deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Must be a member of the group
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Offline member not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// ✅ NEW: DELETE /members/offline/:id - Delete offline member
router.delete('/offline/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = memberParamsSchema.safeParse(req.params);
    if (!validation.success) {
      res.status(422).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid member ID',
        errors: validation.error.errors
      });
      return;
    }

    const { id } = validation.data;
    const userId = req.user!.userId;

    // Check if this is an offline member and user has permission
    const member = await prisma.member.findUnique({
      where: { id },
      include: { group: true }
    });

    if (!member || !member.isOffline) {
      res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Offline member not found'
      });
      return;
    }

    // Check if user is a member of the same group
    const userMembership = await prisma.member.findFirst({
      where: {
        groupId: member.groupId,
        userId
      }
    });

    if (!userMembership) {
      res.status(403).json({
        code: 'FORBIDDEN',
        message: 'You must be a member of this group to delete offline members'
      });
      return;
    }

    // Delete offline member
    await prisma.member.delete({
      where: { id }
    });

    res.json({ message: 'Offline member deleted successfully' });
  } catch (error) {
    console.error('Error deleting offline member:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to delete offline member'
    });
  }
});

export default router;
