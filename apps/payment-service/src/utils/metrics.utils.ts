// src/utils/metrics.utils.ts
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// Create registry
export const register = new Registry();

// ==========================
// HTTP Metrics
// ==========================
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// ==========================
// Payment Metrics
// ==========================
export const paymentOrdersCreated = new Counter({
  name: 'payment_orders_created_total',
  help: 'Total number of payment orders created',
  labelNames: ['plan_id', 'status'],
  registers: [register],
});

export const paymentOrdersAmount = new Histogram({
  name: 'payment_orders_amount',
  help: 'Payment order amounts',
  labelNames: ['plan_id', 'currency'],
  buckets: [100, 500, 1000, 5000, 10000, 50000],
  registers: [register],
});

export const paymentVerifications = new Counter({
  name: 'payment_verifications_total',
  help: 'Total number of payment verifications',
  labelNames: ['status'],
  registers: [register],
});

export const paymentRefunds = new Counter({
  name: 'payment_refunds_total',
  help: 'Total number of payment refunds',
  labelNames: ['status'],
  registers: [register],
});

// ==========================
// Subscription Metrics
// ==========================
export const subscriptionCancellations = new Counter({
  name: 'subscription_cancellations_total',
  help: 'Total number of subscription cancellations',
  registers: [register],
});

export const subscriptionUpgrades = new Counter({
  name: 'subscription_upgrades_total',
  help: 'Total number of subscription upgrades',
  labelNames: ['from_plan', 'to_plan'],
  registers: [register],
});

// ==========================
// RabbitMQ Metrics
// ==========================
export const rabbitmqMessagesPublished = new Counter({
  name: 'rabbitmq_messages_published_total',
  help: 'Total number of messages published to RabbitMQ',
  labelNames: ['event_type'],
  registers: [register],
});

export const rabbitmqMessagesPublishedErrors = new Counter({
  name: 'rabbitmq_messages_published_errors_total',
  help: 'Total number of errors publishing messages to RabbitMQ',
  labelNames: ['event_type'],
  registers: [register],
});

// ==========================
// System Metrics
// ==========================
export const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register],
});

export const databaseQueryDuration = new Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [register],
});

// ==========================
// Error Metrics
// ==========================
export const applicationErrors = new Counter({
  name: 'application_errors_total',
  help: 'Total number of application errors',
  labelNames: ['error_type', 'route'],
  registers: [register],
});

// ==========================
// Default Node.js Metrics
// ==========================
collectDefaultMetrics({
  register,
  prefix: 'node_', // optional but recommended
});