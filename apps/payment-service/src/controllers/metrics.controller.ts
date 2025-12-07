// src/controllers/metrics.controller.ts
import { Request, Response } from 'express';
import { register } from '../utils/metrics.utils.js';

/**
 * Prometheus metrics endpoint
 * Exposes metrics in Prometheus format
 */
export async function getMetrics(req: Request, res: Response) {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch {
    res.status(500).end('Error generating metrics');
  }
}

