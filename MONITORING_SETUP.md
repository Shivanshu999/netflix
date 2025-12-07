# Monitoring Setup with Prometheus and Grafana

This document describes the monitoring infrastructure for the Netflix project using Prometheus and Grafana.

## Overview

- **Prometheus**: Collects metrics from the payment service and other components
- **Grafana**: Visualizes metrics on dashboards for real-time system health monitoring

## Architecture

```
Payment Service → /metrics endpoint → Prometheus → Grafana Dashboards
```

## Services

### Prometheus
- **Port**: 9090
- **URL**: http://localhost:9090
- **Config**: `prometheus/prometheus.yml`
- Scrapes metrics from:
  - Payment Service (port 4000)
  - RabbitMQ (if Prometheus plugin enabled)
  - Prometheus itself

### Grafana
- **Port**: 3001
- **URL**: http://localhost:3001
- **Default Credentials**:
  - Username: `admin`
  - Password: `admin`
- **Dashboards**: Pre-configured dashboard at `/etc/grafana/provisioning/dashboards`

## Metrics Collected

### HTTP Metrics
- `http_requests_total`: Total HTTP requests by method, route, and status code
- `http_request_duration_seconds`: Request duration histogram

### Payment Metrics
- `payment_orders_created_total`: Payment orders created by plan and status
- `payment_orders_amount`: Payment order amounts histogram
- `payment_verifications_total`: Payment verifications by status
- `payment_refunds_total`: Payment refunds by status

### Subscription Metrics
- `subscription_cancellations_total`: Total subscription cancellations
- `subscription_upgrades_total`: Subscription upgrades by plan

### RabbitMQ Metrics
- `rabbitmq_messages_published_total`: Messages published by event type
- `rabbitmq_messages_published_errors_total`: Publishing errors by event type

### System Metrics
- `process_cpu_user_seconds_total`: CPU usage
- `process_resident_memory_bytes`: Memory usage
- `application_errors_total`: Application errors by type and route

## Getting Started

### 1. Start Services

```bash
docker-compose up -d prometheus grafana
```

### 2. Access Grafana

1. Open http://localhost:3001
2. Login with `admin`/`admin`
3. Navigate to Dashboards → Netflix Payment Service Monitoring

### 3. Access Prometheus

1. Open http://localhost:9090
2. Use the query interface to explore metrics
3. Example queries:
   - `rate(http_requests_total[5m])`
   - `rate(payment_orders_created_total[5m])`
   - `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`

## Payment Service Metrics Endpoint

The payment service exposes metrics at:
- **Endpoint**: `GET /metrics`
- **Format**: Prometheus text format
- **Example**: `http://localhost:4000/metrics`

## Custom Metrics

To add custom metrics:

1. Define metrics in `apps/payment-service/src/utils/metrics.utils.ts`
2. Use metrics in your controllers/services
3. Metrics will automatically appear in Prometheus and Grafana

Example:
```typescript
import { myCustomMetric } from '../utils/metrics.utils.js';

// In your code
myCustomMetric.inc({ label: 'value' });
```

## Troubleshooting

### Prometheus can't scrape payment service
- Ensure payment service is running on port 4000
- Check if `/metrics` endpoint is accessible
- Verify network connectivity in docker-compose

### Grafana shows "No data"
- Check if Prometheus is running and accessible
- Verify datasource configuration in Grafana
- Check Prometheus targets at http://localhost:9090/targets

### Metrics not appearing
- Verify metrics are being exported from payment service
- Check Prometheus targets status
- Review Prometheus logs: `docker logs prometheus`

## Dashboard Customization

Grafana dashboards are provisioned from:
- `grafana/dashboards/netflix-monitoring.json`

To customize:
1. Edit the JSON file
2. Restart Grafana: `docker-compose restart grafana`
3. Or use Grafana UI to edit and export

## Alerting (Future)

To set up alerts:
1. Configure Alertmanager in `prometheus/prometheus.yml`
2. Create alert rules in `prometheus/alert_rules.yml`
3. Configure notification channels in Grafana

