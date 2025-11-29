declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT?: string;
      DATABASE_URL: string;
      JWT_SECRET: string;
      FRONTEND_ORIGIN?: string;
      NODE_ENV?: 'development' | 'production' | 'test';
      GOOGLE_MAPS_SERVER_KEY?: string;
    }
  }
}

export {};


