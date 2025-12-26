# Troubleshooting Report - Payment Service

## 1. Route Not Found Error Analysis ✅

### Current Status
The endpoint `https://netflix-2-vsvc.onrender.com/does-not-exist` correctly returns:
```json
{"success":false,"message":"Route not found"}
```

This is **expected behavior** - the route `/does-not-exist` doesn't exist in the payment service.

### Available API Routes

#### Health & Monitoring (No prefix)
- `GET /health` - Health check endpoint
- `GET /metrics` - Prometheus metrics endpoint

#### Payment API Routes (Prefix: `/api/v1`)
- `GET /api/v1/plans` - Get all subscription plans
- `POST /api/v1/payment/create-order` - Create a payment order
- `POST /api/v1/payment/verify` - Verify a payment
- `POST /api/v1/payment/refund` - Refund last payment
- `POST /api/v1/payment/cancel-subscription` - Cancel subscription
- `POST /api/v1/payment/webhook` - Razorpay webhook handler

### Testing Valid Routes
```bash
# Health check
curl https://netflix-2-vsvc.onrender.com/health

# Get plans
curl https://netflix-2-vsvc.onrender.com/api/v1/plans

# Metrics
curl https://netflix-2-vsvc.onrender.com/metrics
```

---

## 2. RabbitMQ Connection Configuration 🔧

### Current Configuration
- **Payment Service** (`apps/payment-service/src/services/rabbitmq.service.ts`):
  - Requires `RABBITMQ_URL` environment variable (mandatory)
  - Default queue: `payment_events` (configurable via `PAYMENT_QUEUE`)
  - Has automatic reconnection logic (5 second retry)

### Server Setup Analysis
Based on your Docker containers:
- **RabbitMQ Container**: `rabbitmq` (port 5672)
- **Default Credentials**: `guest:guest`
- **Server IP**: `172.31.29.190`

### Recommended RABBITMQ_URL Values

#### Option 1: Docker Network (Recommended if services run in Docker)
```env
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
```
Use this if payment-service runs in Docker and is on the same network as RabbitMQ.

#### Option 2: Localhost (If payment-service runs on host)
```env
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```
Use this if payment-service runs directly on the Ubuntu server (not in Docker).

#### Option 3: Server IP (If connecting from external service)
```env
RABBITMQ_URL=amqp://guest:guest@172.31.29.190:5672
```
Use this if payment-service runs on a different server.

### Verification Steps
1. **Check if RabbitMQ is accessible:**
   ```bash
   # From server
   curl http://localhost:15672/api/overview
   # Or check management UI: http://172.31.29.190:15672
   ```

2. **Test connection from payment-service:**
   ```bash
   # Check payment-service logs for RabbitMQ connection status
   # Should see: "RabbitMQ publisher connected"
   ```

3. **Verify queue exists:**
   ```bash
   # Access RabbitMQ management UI
   # Navigate to Queues tab
   # Check if "payment_events" queue exists
   ```

---

## 3. Environment Configuration Files 📋

### Required Environment Variables

The payment-service requires these environment variables (from `env.config.ts`):

#### Mandatory Variables
```env
# Database
DATABASE_URL=postgresql://root:root@localhost:5433/netflixdb

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

#### Optional Variables (with defaults)
```env
# Server
PORT=3002
NODE_ENV=production
API_PREFIX=/api/v1

# RabbitMQ
PAYMENT_QUEUE=payment_events

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Server-Specific Configuration

Based on your server setup, recommended values:

```env
# Database (PostgreSQL on port 5433)
DATABASE_URL=postgresql://root:root@postgres_db:5432/netflixdb
# OR if connecting from host:
DATABASE_URL=postgresql://root:root@localhost:5433/netflixdb

# RabbitMQ (choose based on deployment method)
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
# OR
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# Port
PORT=3002

# CORS (update with your frontend URL)
CORS_ORIGIN=https://your-frontend-domain.com
```

### Where to Set Environment Variables

1. **Docker Compose** (if using docker-compose):
   ```yaml
   services:
     payment-service:
       environment:
         - RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
         - DATABASE_URL=postgresql://root:root@postgres_db:5432/netflixdb
   ```

2. **Dockerfile/Container** (if running in container):
   ```dockerfile
   ENV RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
   ```

3. **System Environment** (if running directly):
   ```bash
   export RABBITMQ_URL=amqp://guest:guest@localhost:5672
   ```

4. **Render.com** (if deployed there):
   - Set via Render dashboard → Environment Variables

---

## 4. Recommendations & Next Steps 🚀

### Immediate Actions

1. **Verify RabbitMQ Connection:**
   - Check payment-service logs for connection status
   - Ensure `RABBITMQ_URL` is correctly set for your deployment method
   - Test connection using RabbitMQ management UI (port 15672)

2. **Test Valid Endpoints:**
   ```bash
   # Health check
   curl https://netflix-2-vsvc.onrender.com/health
   
   # Get plans
   curl https://netflix-2-vsvc.onrender.com/api/v1/plans
   ```

3. **Check Environment Variables:**
   - Verify all required variables are set
   - Ensure `RABBITMQ_URL` matches your deployment architecture
   - Confirm database connection string is correct

### Potential Issues to Check

1. **RabbitMQ Connection:**
   - If payment-service runs in Docker, use container name: `rabbitmq:5672`
   - If payment-service runs on host, use: `localhost:5672`
   - Check firewall rules if connecting from external service

2. **Network Configuration:**
   - Ensure Docker containers are on the same network
   - Verify port mappings are correct
   - Check if RabbitMQ port 5672 is accessible

3. **Service Startup Order:**
   - Ensure RabbitMQ starts before payment-service
   - Payment-service has retry logic, but initial connection may fail

### Debugging Commands

```bash
# Check RabbitMQ status
docker exec rabbitmq rabbitmqctl status

# Check RabbitMQ queues
docker exec rabbitmq rabbitmqctl list_queues

# Check payment-service logs
docker logs <payment-service-container-id>

# Test RabbitMQ connection
docker exec rabbitmq rabbitmqctl ping
```

---

## Summary

✅ **Route Not Found**: Working as expected - invalid routes return 404  
⚠️ **RabbitMQ Config**: Needs verification based on deployment method  
⚠️ **Environment Variables**: Ensure all required vars are set correctly  

The main focus should be ensuring `RABBITMQ_URL` matches your deployment architecture (Docker vs host-based).

