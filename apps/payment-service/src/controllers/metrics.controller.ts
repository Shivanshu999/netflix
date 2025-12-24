// src/controllers/metrics.controller.ts
import { Request, Response } from 'express';
import { register } from '../utils/metrics.utils.js';

/**
 * Prometheus metrics endpoint
 * Exposes metrics in Prometheus format
 */
export async function getMetrics(req: Request, res: Response) {
  try {
    res.setHeader('Content-Type', register.contentType);
    res.setHeader('Cache-Control', 'no-store'); // important

    const metrics = await register.metrics();
    res.status(200).send(metrics);
  } catch (error) {
    res.status(500).send('Error generating metrics');
  }
}