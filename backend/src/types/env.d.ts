declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT?: string;
      DATABASE_URL: string;
      JWT_SECRET: string;
      FRONTEND_ORIGIN?: string;
      NODE_ENV?: 'development' | 'production' | 'test';
      // Turso (libSQL) specific
      TURSO_DATABASE_URL?: string;
      TURSO_AUTH_TOKEN?: string;
    }
  }
}

export {};


