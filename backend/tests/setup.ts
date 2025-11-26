import { beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

// Force test database isolation
process.env.DATABASE_URL = 'file:./test.db';
process.env.NODE_ENV = 'test';

// Create test database instance
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

beforeAll(async () => {
  // Setup: Could run migrations or seed data here
  console.log('🔧 Test setup complete');
});

afterAll(async () => {
  // Cleanup: Disconnect from database
  await prisma.$disconnect();
  console.log('🧹 Test cleanup complete');
});

