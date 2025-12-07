import { Request, Response, NextFunction } from 'express';
import { createPaymentOrder } from '../services/payment.service.js';
import { getPlan, isValidPlanId } from '../services/plan.service.js';
import { logger } from '../utils/logger.utils.js';
import { paymentOrdersCreated, paymentOrdersAmount } from '../utils/metrics.utils.js';
import type { CreateOrderRequest } from '../types/payment.types.js';

export async function createOrder(
  req: Request<{}, {}, CreateOrderRequest>,
  res: Response,
  next: NextFunction
) {
  try {
    const { userId, planId, amount: providedAmount, currency } = req.body;

    // Validate planId exists in backend plan data
    if (!isValidPlanId(planId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid plan ID: ${planId}`,
      });
    }

    // Get plan from backend (source of truth)
    const plan = getPlan(planId);
    if (!plan) {
      return res.status(400).json({
        success: false,
        message: `Plan not found: ${planId}`,
      });
    }

    // Use backend-calculated amount (trust only backend plan data)
    // If amount is provided (e.g., for upgrades with discounts), use it
    // Otherwise, use the plan's default amount
    const finalAmount = providedAmount ?? plan.amount;
    const finalCurrency = currency || plan.currency;

    logger.info('Creating payment order', { 
      userId, 
      planId, 
      amount: finalAmount,
      source: providedAmount ? 'provided' : 'backend-plan'
    });

    const order = await createPaymentOrder({
      userId,
      planId,
      amount: finalAmount,
      currency: finalCurrency,
    });

    // Track metrics
    paymentOrdersCreated.inc({ plan_id: planId, status: 'success' });
    paymentOrdersAmount.observe({ plan_id: planId, currency: finalCurrency }, finalAmount);

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    // Track failed orders
    const planId = req.body?.planId || 'unknown';
    paymentOrdersCreated.inc({ plan_id: planId, status: 'failed' });
    
    logger.error('Error creating order:', error);
    next(error);
  }
}