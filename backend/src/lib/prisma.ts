import { PrismaClient } from '@prisma/client';

// Create Prisma Client for PostgreSQL
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

if (process.env.NODE_ENV !== 'test') {
  console.log('✅ Connected to PostgreSQL database');
}

export default prisma;


