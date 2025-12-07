// src/controllers/plan.controller.ts
import { Request, Response, NextFunction } from 'express';
import { getAllPlans } from '../services/plan.service.js';
import { logger } from '../utils/logger.utils.js';

/**
 * Get all available subscription plans
 * This is the source of truth for plan configurations
 */
export async function getPlans(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const plans = getAllPlans();
    
    logger.info('Plans requested', { count: plans.length });

    res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (error) {
    logger.error('Error fetching plans:', error);
    next(error);
  }
}



