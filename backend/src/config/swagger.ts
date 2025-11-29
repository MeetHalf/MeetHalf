import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MeetHalf API',
      version: '1.0.0',
      description: 'MeetHalf Backend API Documentation',
      contact: {
        name: 'MeetHalf Team',
      },
    },
    servers: [
      // Production/Preview server (Vercel automatically provides VERCEL_URL)
      ...(process.env.VERCEL_URL ? [{
        url: process.env.VERCEL_URL.startsWith('http') 
          ? process.env.VERCEL_URL 
          : `https://${process.env.VERCEL_URL}`,
        description: 'Production server',
      }] : []),
      // Development servers
      ...(process.env.NODE_ENV === 'development' || !process.env.VERCEL_URL ? [
        {
          url: 'http://localhost:3000',
          description: 'Local development',
        },
        {
          url: 'http://127.0.0.1:3000',
          description: 'Local development (alternative)',
        },
      ] : []),
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'Error code',
            },
            message: {
              type: 'string',
              description: 'Error message',
            },
            details: {
              type: 'object',
              description: 'Additional error details',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              format: 'int64',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Group: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
            ownerId: {
              type: 'integer',
              format: 'int64',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
            owner: {
              $ref: '#/components/schemas/User',
            },
            members: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Member',
              },
            },
          },
        },
        Member: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              format: 'int64',
            },
            userId: {
              type: 'integer',
              format: 'int64',
              nullable: true,
            },
            groupId: {
              type: 'string',
            },
            lat: {
              type: 'number',
              format: 'float',
              nullable: true,
            },
            lng: {
              type: 'number',
              format: 'float',
              nullable: true,
            },
            address: {
              type: 'string',
              nullable: true,
            },
            travelMode: {
              type: 'string',
              enum: ['driving', 'walking', 'transit', 'bicycling'],
            },
            nickname: {
              type: 'string',
              nullable: true,
            },
            isOffline: {
              type: 'boolean',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
            user: {
              $ref: '#/components/schemas/User',
              nullable: true,
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Auth',
        description: 'Authentication endpoints',
      },
      {
        name: 'Events',
        description: 'Group management endpoints',
      },
      {
        name: 'Members',
        description: 'Member management endpoints',
      },
      {
        name: 'Maps',
        description: 'Google Maps API proxy endpoints',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/index.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

