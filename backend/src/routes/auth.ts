import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { signToken } from '../utils/jwt';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Zod schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// POST /auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const { email, password } = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({
        code: 'USER_EXISTS',
        message: 'User with this email already exists',
      });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      message: 'User registered successfully',
      user,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: error.errors,
      });
      return;
    }

    console.error('Register error:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'An error occurred during registration',
    });
  }
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const { email, password } = loginSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(401).json({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      res.status(401).json({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
      return;
    }

    // Generate JWT
    const token = signToken(user.id);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: error.errors,
      });
      return;
    }

    console.error('Login error:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'An error occurred during login',
    });
  }
});

// GET /auth/me
router.get('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Not authenticated',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'An error occurred while fetching user',
    });
  }
});

// POST /auth/logout
router.post('/logout', (req: Request, res: Response): void => {
  res.clearCookie('token');
  res.json({ message: 'Logout successful' });
});

export default router;


