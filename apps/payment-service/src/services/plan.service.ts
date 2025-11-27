// src/services/plan.service.ts

export type PlanId = "monthly" | "yearly";

export interface SubscriptionPlan {
  id: PlanId;
  label: string;
  amount: number; // in INR (not paise)
  currency: string;
  interval: string;
  tagline: string;
  perks: string[];
  monthlyEquivalent: number; // For upgrade discount calculation
}

/**
 * Source of truth for all subscription plans
 * This is the ONLY place where plan prices should be defined
 */
export const SUBSCRIPTION_PLANS: Record<PlanId, SubscriptionPlan> = {
  monthly: {
    id: "monthly",
    label: "Monthly Plan",
    amount: 499,
    currency: "INR",
    interval: "Billed every month",
    tagline: "Stream everything with a flexible monthly plan.",
    perks: ["HD + UHD streaming", "Watch on 2 screens", "Cancel anytime"],
    monthlyEquivalent: 499,
  },
  yearly: {
    id: "yearly",
    label: "Yearly Plan",
    amount: 4999,
    currency: "INR",
    interval: "Billed once a year",
    tagline: "Best value — save over 15% vs monthly billing.",
    perks: ["HD + UHD streaming", "Watch on 4 screens", "Priority support"],
    monthlyEquivalent: 416.58, // 4999 / 12
  },
};

/**
 * Get plan by ID
 */
export function getPlan(planId: string): SubscriptionPlan | null {
  if (planId in SUBSCRIPTION_PLANS) {
    return SUBSCRIPTION_PLANS[planId as PlanId];
  }
  return null;
}

/**
 * Validate if planId is valid
 */
export function isValidPlanId(planId: string): planId is PlanId {
  return planId in SUBSCRIPTION_PLANS;
}

/**
 * Get all available plans
 */
export function getAllPlans(): SubscriptionPlan[] {
  return Object.values(SUBSCRIPTION_PLANS);
}

/**
 * Calculate upgrade price when user has already paid for monthly subscription
 * Returns the discounted amount for yearly plan (yearly price - remaining monthly value)
 */
export function calculateUpgradePrice(
  currentPlan: PlanId,
  newPlan: PlanId,
  currentExpiresAt: Date
): { amount: number; discount: number; originalAmount: number } {
  if (currentPlan === "yearly" || newPlan === "monthly") {
    // No upgrade discount for these cases
    const plan = getPlan(newPlan);
    if (!plan) {
      throw new Error(`Invalid plan: ${newPlan}`);
    }
    return {
      amount: plan.amount,
      discount: 0,
      originalAmount: plan.amount,
    };
  }

  // Monthly → Yearly upgrade
  const now = new Date();
  const timeRemaining = currentExpiresAt.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(timeRemaining / (1000 * 60 * 60 * 24)));
  const monthsRemaining = daysRemaining / 30;

  const monthlyPlan = SUBSCRIPTION_PLANS.monthly;
  const yearlyPlan = SUBSCRIPTION_PLANS.yearly;
  const remainingValue = Math.round(monthlyPlan.amount * monthsRemaining);
  const discountedAmount = Math.max(0, yearlyPlan.amount - remainingValue);

  return {
    amount: discountedAmount,
    discount: remainingValue,
    originalAmount: yearlyPlan.amount,
  };
}
