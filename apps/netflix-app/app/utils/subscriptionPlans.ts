export type SubscriptionPlanId = "monthly" | "yearly";

type SubscriptionPlan = {
  id: SubscriptionPlanId;
  label: string;
  amount: number;
  currency: string;
  interval: string;
  tagline: string;
  perks: string[];
  monthlyEquivalent: number; // For upgrade discount calculation
};

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, SubscriptionPlan> = {
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
 * Calculate upgrade price when user has already paid for monthly subscription
 * Returns the discounted amount for yearly plan (yearly price - remaining monthly value)
 */
export function calculateUpgradePrice(
  currentPlan: SubscriptionPlanId,
  newPlan: SubscriptionPlanId,
  currentExpiresAt: Date
): { amount: number; discount: number; originalAmount: number } {
  if (currentPlan === "yearly" || newPlan === "monthly") {
    // No upgrade discount for these cases
    return {
      amount: SUBSCRIPTION_PLANS[newPlan].amount,
      discount: 0,
      originalAmount: SUBSCRIPTION_PLANS[newPlan].amount,
    };
  }

  // Monthly → Yearly upgrade
  const now = new Date();
  const timeRemaining = currentExpiresAt.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(timeRemaining / (1000 * 60 * 60 * 24)));
  const monthsRemaining = daysRemaining / 30;

  const monthlyPrice = SUBSCRIPTION_PLANS.monthly.amount;
  const yearlyPrice = SUBSCRIPTION_PLANS.yearly.amount;
  const remainingValue = Math.round(monthlyPrice * monthsRemaining);
  const discountedAmount = Math.max(0, yearlyPrice - remainingValue);

  return {
    amount: discountedAmount,
    discount: remainingValue,
    originalAmount: yearlyPrice,
  };
}




