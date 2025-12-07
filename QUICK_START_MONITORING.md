# Quick Start: Monitoring Setup

## Prerequisites
- Docker and Docker Compose installed
- Payment service running on port 4000

## Start Monitoring Services

```bash
# Start Prometheus and Grafana
docker-compose up -d prometheus grafana

# Check status
docker-compose ps
```

## Access Dashboards

### Grafana
- **URL**: http://localhost:3001
- **Username**: `admin`
- **Password**: `admin`
- **Dashboard**: Navigate to "Dashboards" → "Netflix Payment Service Monitoring"

### Prometheus
- **URL**: http://localhost:9090
- **Query Examples**:
  - `rate(http_requests_total[5m])` - Request rate
  - `rate(payment_orders_created_total[5m])` - Order creation rate
  - `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))` - P95 latency

## Verify Metrics Endpoint

```bash
# Check if payment service exposes metrics
curl http://localhost:4000/metrics
```

## Stop Services

```bash
docker-compose stop prometheus grafana
```

## Troubleshooting

1. **Prometheus can't scrape metrics**: Ensure payment service is running and accessible
2. **No data in Grafana**: Check Prometheus targets at http://localhost:9090/targets
3. **Connection refused**: Verify services are running with `docker-compose ps`

