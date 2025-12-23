// src/config/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'T-Shaped Marketing API',
      version: '1.0.0',
      description: 'REST API documentation for T-Shaped Marketing',
    },
    servers: [
      {
        url: 'https://api.pranishpdl.ai/',
        description: 'Production server',
      },
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: [
    './src/routes/*.ts',
    './dist/routes/*.js',
    './src/routes/**/*.ts',
    './dist/routes/**/*.js',
  ], // Path to your route files
};

export const specs = swaggerJsdoc(options);
