import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRouter from './routes/auth.routes.js';
import courseRouter from './routes/course.routes.js';
import swaggerUi from 'swagger-ui-express';
import { specs } from './config/swagger.config.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.middleware.js';
import lessonRouter from './routes/lesson.routes.js';
import settingsRouter from './routes/settings.routes.js';
import layoutRouter from './routes/layout.route.js';
import topicRouter from './routes/topic.routes.js';
import stripeRouter from './routes/stripe.routes.js';
import path from 'path';
import { fileURLToPath } from 'url';
import assignmentRouter from './routes/assignment.routes.js';
import submissionRouter from './routes/assignmentSubmit.route.js';
import healthRouter from './routes/health.route.js';
import commentRouter from './routes/comment.routes.js';
import certificateRouter from './routes/certificate.routes.js';
import { uploadRouter } from './routes/upload.routes.js';
import { blogRouter } from './routes/blog.routes.js';
import downloadRouter from './routes/download.routes.js';
import { contactRouter } from './routes/message.routes.js';
import { errorHandlerRouter } from './routes/errorHandler.routes.js';
import { successHandlerRouter } from './routes/successHandler.routes.js';
import reportRouter from './routes/report.routes.js';
import { NotificationService } from './services/notification.service.js';
import { notificationRouter } from './routes/notification.routes.js';
import studentRouter from './routes/student/studentRouterProvider.js';
import courseReviewRouter from './routes/review.routes.js';
import { heroComponentRouter } from './routes/heroComponent.routes.js';
import { seedHeroComponents } from './utils/seedHeroComponents.js';
import responseTime from 'response-time';
import client from 'prom-client';
import { logErrorLoki } from './utils/lokiConfig.js';
import { taskTracker } from './utils/executeBackgroundTasks.js';
import basicAuth from 'express-basic-auth';
import { FRONTEND_URL } from './constants/env.constant.js';
const app = express();
const httpServer = createServer(app);

const swaggerAuth = basicAuth({
  users: { [process.env.SWAGGER_USER || 'admin']: process.env.SWAGGER_PASS || '9m38aQvABAR8xq7P' },
  challenge: true,
});


//Prometheus metrics endpoint
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

const reqResTime = new client.Histogram({
  name: 'req_res_time',
  help: 'Request and Response Time',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [1, 50, 100, 200, 400, 500, 800, 1000, 2000],
});

const totalRequests = new client.Counter({
  name: 'total_requests',
  help: 'Total number of requests',
});
// Middleware to measure request and response time
app.use(
  responseTime((req: any, res, time) => {
    const fullPath = req.baseUrl + req.path;
    const excludePaths = ['/metrics', '/health', '/api/health/'];
    if (!excludePaths.includes(fullPath)) {
    totalRequests.inc();
    reqResTime
      .labels({
        method: req.method,
        route: fullPath,
        status_code: res.statusCode.toString(),
      })
      .observe(time);
    }
  
  }),
);

//Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {

  res.set('Content-Type', client.register.contentType);
  const metrics = await client.register.metrics();
  res.send(metrics);
});
// Socket.IO initialization with CORS configuration
export const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'https://localhost:3000', FRONTEND_URL],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  },
});

const PORT = 3001;

// Socket.IO connection handling
io.on('connection', socket => {

  logErrorLoki(`'Client connected:', ${socket.id}`, false);
  // Handle joining user-specific room for notifications
  socket.on('joinRoom', (userInfo: any) => {
    socket.join(userInfo.userId);
  });

  // Handle user disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Initialize Notification Service with Socket.IO instance
export const notificationService = new NotificationService(io);

// Basic middleware for all routes
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://localhost:3000',
    FRONTEND_URL
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization', 'authorization'],
  credentials: true,
  maxAge: 86400,
};

// Apply CORS with configuration
app.use(cors(corsOptions));
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    xssFilter: true, // Adds X-XSS-Protection header
    frameguard: {
      // Prevents clickjacking
      action: 'deny',
    },
  }),
);

app.set('trust proxy', 3);
app.get('/ip', (request:any, response:any) => response.send(request.ip))
app.get('/proxy-info', (req: any, res: any) => {
  const xForwardedFor = req.headers['x-forwarded-for'];

  // Split the header if it exists
  const ips = typeof xForwardedFor === 'string'
    ? xForwardedFor.split(',').map(ip => ip.trim())
    : [];

  res.json({
    originalHeader: xForwardedFor,
    numberOfProxies: ips.length,
    proxyChain: ips,
    reqIp: req.ip,
    connectionRemoteAddress: req.connection.remoteAddress,
  });
});

// Custom middleware to handle both JSON and raw bodies
app.use((req, res, next) => {
  if (req.originalUrl === '/api/stripe/webhook') {
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    bodyParser.json({ limit: '50kb' })(req, res, next);
  }
});

// Only apply urlencoded middleware to non-webhook routes
app.use((req, res, next) => {
  if (req.originalUrl === '/api/stripe/webhook') {
    next();
  } else {
    bodyParser.urlencoded({ extended: true })(req, res, next);
  }
});

//upload middleware
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Swagger documentation
app.use(
  '/api-docs',
  swaggerAuth, 
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    explorer: true,
    customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.1.0/swagger-ui.min.css',
  }),
);

//Cookie
app.use(cookieParser());

//Rate Limiter
// app.use(defaultLimiter);


//Background tasks
app.get('/api/background/tasks', (req, res) => {
  const count = taskTracker.getActiveTaskCount();

// Get all active tasks
const allTasks = taskTracker.getActiveTasks();


 const getCompletedTasks = taskTracker.getCompletedTasks();
  res.status(200).json({
    message: 'Active tasks retrieved successfully',
    count,
    allTasks,
    getCompletedTasks
  });
})

// API Routes
app.use('/api/auth' ,authRouter);
app.use('/api/course', courseRouter);
app.use('/api/lessons', lessonRouter);
app.use('/api/topics', topicRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/layout', layoutRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/assignments', assignmentRouter);
app.use('/api/submissions', submissionRouter);
app.use('/api/health', healthRouter);
app.use('/api/comments', commentRouter);
app.use('/api/certificates', certificateRouter);
app.use('/api/stripe', stripeRouter);
app.use('/api/blogs', blogRouter);
app.use('/api/downloads', downloadRouter);
app.use('/api/contact', contactRouter);
app.use('/api/error-handlers', errorHandlerRouter);
app.use('/api/success-handlers', successHandlerRouter);
app.use('/api/reports', reportRouter);
app.use('/api/course-reviews', courseReviewRouter);
app.use('/api/hero-components', heroComponentRouter);
// Add notification routes
app.use('/api/notifications', notificationRouter);

//Student Router
app.use('/api/student', studentRouter);

// Error handling
app.use(errorHandler);
app.use(notFoundHandler);



// Start server using httpServer instead of app.listen
export const startServer = () => {
  httpServer.listen(PORT, async () => {
    try {
      await seedHeroComponents();
      console.log('Hero components seeded');
    } catch (e) {
      console.error('Failed to seed hero components', e);
    }

    console.log(`Server running on port ${PORT}`);
    logErrorLoki(`Server running on port ${PORT}`, false);
  });
};


export default app;
// Export io instance for use in other files if needed