import express, { Router, Request, Response } from 'express';

interface HealthCheckResponse {
  status: string;
  timestamp: string;
  uptime: number;
  version: string;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

const healthRouter: Router = express.Router();

healthRouter.get('/', async (_req: Request, res: Response<HealthCheckResponse>) => {
  try {
    const memoryUsage = process.memoryUsage();

    const healthCheck: HealthCheckResponse = {
      status: 'System is healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.version,
      memoryUsage: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // Convert to MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
      },
    };
    console.log(healthCheck);
    res.status(200).json(healthCheck);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.version,
      memoryUsage: {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
      },
    });
  }
});

export default healthRouter;
