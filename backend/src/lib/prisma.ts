import { PrismaClient } from '@prisma/client';
import { createClient } from '@libsql/client';

// Try to import Prisma libSQL adapter (may not be available in Prisma 5.x)
let PrismaLibSQL: any;
try {
  const adapterModule = require('@prisma/adapter-libsql');
  PrismaLibSQL = adapterModule.PrismaLibSQL || adapterModule.default;
} catch (error) {
  // Adapter not available, will use alternative method
  if (process.env.NODE_ENV !== 'test') {
    console.warn('⚠️  @prisma/adapter-libsql not available, using direct connection');
  }
}

// Determine database configuration based on environment
function getDatabaseConfig() {
  // Priority 1: Use Turso if TURSO_DATABASE_URL is provided (production/Vercel)
  if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
    return {
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
      isTurso: true,
    };
  }
  
  // Priority 2: Use DATABASE_URL (could be libsql:// or file://)
  if (process.env.DATABASE_URL) {
    const isTurso = process.env.DATABASE_URL.startsWith('libsql://');
    // Extract auth token from URL if present (format: libsql://...?authToken=...)
    let authToken = process.env.TURSO_AUTH_TOKEN;
    if (isTurso && !authToken) {
      const url = new URL(process.env.DATABASE_URL);
      authToken = url.searchParams.get('authToken') || undefined;
    }
    
    return {
      url: process.env.DATABASE_URL,
      authToken,
      isTurso,
    };
  }
  
  // Priority 3: Fallback to local SQLite
  return {
    url: 'file:./prisma/dev.db',
    authToken: undefined,
    isTurso: false,
  };
}

const dbConfig = getDatabaseConfig();

// Create Prisma Client
let prisma: PrismaClient;

if (dbConfig.isTurso && dbConfig.authToken) {
  // Try to use libSQL adapter if available (Prisma 7.x)
  if (PrismaLibSQL) {
    try {
      const libsql = createClient({
        url: dbConfig.url,
        authToken: dbConfig.authToken,
      });
      
      const adapter = new PrismaLibSQL(libsql);
      
      prisma = new PrismaClient({
        // @ts-ignore - Adapter type compatibility between Prisma versions
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      });
      
      if (process.env.NODE_ENV !== 'test') {
        console.log('✅ Connected to Turso (libSQL) database using adapter');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Prisma with libSQL adapter:', error);
      console.log('⚠️  Falling back to direct connection...');
      
      // Fallback to direct connection
      prisma = new PrismaClient({
        datasources: {
          db: {
            url: dbConfig.url.includes('?') 
              ? dbConfig.url 
              : `${dbConfig.url}?authToken=${dbConfig.authToken}`,
          },
        },
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      });
    }
  } else {
    // Fallback: Use Prisma directly with libsql:// URL (Prisma 5.7+)
    // Note: This requires Prisma 5.7+ which supports libsql:// URLs
    const databaseUrl = dbConfig.url.includes('?') 
      ? dbConfig.url 
      : `${dbConfig.url}?authToken=${dbConfig.authToken}`;
    
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
    
    if (process.env.NODE_ENV !== 'test') {
      console.log('✅ Connected to Turso (libSQL) database using direct connection');
      console.warn('⚠️  Consider upgrading to Prisma 7.x for better libSQL support');
    }
  }
} else {
  // Use default Prisma Client for local SQLite
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
  
  if (process.env.NODE_ENV !== 'test') {
    const dbType = dbConfig.url.startsWith('libsql://') ? 'Turso (libSQL)' : 'local SQLite';
    console.log(`✅ Connected to ${dbType} database`);
  }
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;


