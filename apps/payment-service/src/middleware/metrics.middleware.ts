// src/middleware/metrics.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { httpRequestDuration, httpRequestTotal, applicationErrors } from '../utils/metrics.utils.js';

export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startTime = Date.now();

  // Get route path (normalize for metrics)
  // Use route path if available, otherwise use the request path
  let route = req.route?.path || req.path || 'unknown';
  
  // Normalize route to avoid high cardinality (remove IDs, etc.)
  // Replace UUIDs and IDs with placeholders
  route = route.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id');
  route = route.replace(/\/\d+/g, '/:id');
  
  // Remove query string
  route = route.split('?')[0];

  // Override res.end to capture response status
  const originalEnd = res.end.bind(res);
  res.end = function (chunk?: any, encoding?: any, cb?: any): Response {
    const duration = (Date.now() - startTime) / 1000; // Convert to seconds
    const statusCode = res.statusCode.toString();

    // Record metrics
    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status_code: statusCode,
      },
      duration
    );

    httpRequestTotal.inc({
      method: req.method,
      route,
      status_code: statusCode,
    });

    // Track errors (4xx and 5xx)
    if (res.statusCode >= 400) {
      applicationErrors.inc({
        error_type: res.statusCode >= 500 ? 'server_error' : 'client_error',
        route,
      });
    }

    // Call original end method
    return originalEnd(chunk, encoding, cb);
  };

  next();
}

