import express from 'express';
import cors from 'cors';
import  helmet  from "helmet";
import dotenv from 'dotenv';
import { config } from './config/env.config.js';
import { paymentRoutes } from './routes/paymentRoutes.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { metricsMiddleware } from './middleware/metrics.middleware.js';
import { getMetrics } from './controllers/metrics.controller.js';
import { logger } from './utils/logger.utils.js'; 
import { initRabbitMQ } from './services/rabbitmq.service.js';
import { setupAutoRenewCron } from './cron/auto-renew.cron.js';

dotenv.config();
console.log("CURRENT DATABASE_URL =", process.env.DATABASE_URL);


const app = express();

// Security Middleware
app.use(helmet());

// CORS Configuration - support multiple origins (comma-separated)
const corsOrigins = config.corsOrigin.split(',').map(origin => origin.trim());
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (corsOrigins.includes(origin) || corsOrigins.includes('*')) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}. Allowed origins: ${corsOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
logger.info(`🌐 CORS configured for origins: ${corsOrigins.join(', ')}`);

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Metrics Middleware (before other middleware to capture all requests)
app.use(metricsMiddleware);

// Request Logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    body: req.body,
    query: req.query,
  });
  next();
});

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'payment-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Prometheus Metrics Endpoint
app.get('/metrics', getMetrics);

// API Routes
app.use(config.apiPrefix, paymentRoutes);

// Error Handler (Must be last)
app.use(errorMiddleware);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Initialize RabbitMQ and Start Server
async function bootstrap() {
  try {
    await initRabbitMQ();
    logger.info('✅ RabbitMQ connected');

    // Setup auto-renewal cron jobs
    setupAutoRenewCron();

    app.listen(config.port, () => {
      logger.info(`💳 Payment Service running on port ${config.port}`);
      logger.info(`📍 API Prefix: ${config.apiPrefix}`);
      logger.info(`🌍 Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    logger.error('❌ Bootstrap failed:', error);
    process.exit(1);
  }
}

// Graceful Shutdown
process.on('SIGINT', async () => {
  logger.info('🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

bootstrap();
export default app;
