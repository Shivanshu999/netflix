"use client";

import { useEffect, useMemo, useState } from "react";
import { SubscriptionPlanId } from "@/app/utils/subscriptionPlans";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

type SubscriptionPlan = {
  id: SubscriptionPlanId;
  label: string;
  amount: number;
  currency: string;
  interval: string;
  tagline: string;
  perks: string[];
  monthlyEquivalent: number;
};

type SubscribeClientProps = {
  userEmail?: string | null;
  isActive: boolean;
  currentPlan?: string | null;
  currentEndsAt?: string | null;
  autoRenew?: boolean;
};

declare global {
  interface Window {
    Razorpay?: new (options: any) => {
      open: () => void;
      on: (event: string, handler: (response: any) => void) => void;
      close: () => void;
    };
  }
}

export function SubscribeClient({
  userEmail,
  isActive,
  currentPlan,
  currentEndsAt,
  autoRenew = true,
}: SubscribeClientProps) {
  // If user has monthly plan, default to yearly (upgrade)
  const defaultPlan =
    isActive && currentPlan === "monthly" ? "yearly" : "monthly";
  const [selectedPlan, setSelectedPlan] =
    useState<SubscriptionPlanId>(defaultPlan);
  const [scriptReady, setScriptReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [upgradeInfo, setUpgradeInfo] = useState<{
    discount: number;
    originalAmount: number;
    discountedAmount: number;
  } | null>(null);
  const router = useRouter();

  // Fetch plans from backend API
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch("/api/subscription/plans");
        const data = await response.json();

        if (response.ok && data.success && data.data) {
          setPlans(data.data);
        } else {
          console.error(
            "Failed to fetch plans:",
            data.message || "Unknown error",
            data
          );
          // Don't set plans, so error message will show
        }
      } catch (error) {
        console.error("Failed to fetch plans:", error);
        // Don't set plans, so error message will show
      } finally {
        setPlansLoading(false);
      }
    };

    fetchPlans();
  }, []);

  // Create plans map for easy lookup
  const plansMap = useMemo(() => {
    const map: Record<string, SubscriptionPlan> = {};
    plans.forEach((plan) => {
      map[plan.id] = plan;
    });
    return map;
  }, [plans]);

  useEffect(() => {
    if (window.Razorpay) {
      setScriptReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setScriptReady(true);
    script.onerror = () => {
      console.error("Failed to load Razorpay script");
    };

    document.body.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, []);

  const handleCancel = async () => {
    if (cancelLoading) return;
    setCancelLoading(true);

    try {
      const response = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        // If already cancelled, refresh the page to update UI
        if (data?.alreadyCancelled) {
          window.location.reload();
          return;
        }
        throw new Error(data?.message || "Unable to cancel membership");
      }

      // After cancelling, always go back to home
      router.push("/home");
    } catch (error) {
      console.error("Subscription cancel failed:", error);
      alert(
        error instanceof Error ? error.message : "Unable to cancel membership"
      );
    } finally {
      setCancelLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!scriptReady || loading) return;

    setLoading(true);
    setUpgradeInfo(null);

    try {
      // Check if this is an upgrade (user has monthly, selecting yearly)
      const isUpgrade =
        isActive && currentPlan === "monthly" && selectedPlan === "yearly";
      const endpoint = isUpgrade
        ? "/api/subscription/upgrade"
        : "/api/subscription/checkout";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId: selectedPlan }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error?.message || "Unable to start checkout");
      }

      const payload = await response.json();
      const order = payload?.data;

      // Store upgrade info if available
      if (payload.upgradeInfo) {
        setUpgradeInfo(payload.upgradeInfo);
      }

      if (!window.Razorpay) {
        throw new Error("Payment SDK not available");
      }

      const plan = plansMap[selectedPlan];
      if (!plan) {
        throw new Error("Plan not found");
      }
      // order.amount is already in paise from Razorpay, use it directly
      const displayAmount = order.amount;

      const options = {
        key: order.razorpayKeyId,
        amount: displayAmount,
        currency: order.currency,
        name: "MovieVerse Subscription",
        description:
          isUpgrade && upgradeDiscount
            ? `Upgrade to ${plan.label} - Save ₹${upgradeDiscount.discount.toLocaleString("en-IN")}!`
            : plan.tagline,
        order_id: order.orderId,
        handler: async function (checkoutResponse: any) {
          try {
            const verifyResponse = await fetch("/api/subscription/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(checkoutResponse),
            });

            if (verifyResponse.ok) {
              // Immediately redirect to home, don't wait
              window.location.href = "/home";
            } else {
              // If verification fails, still redirect but log error
              console.error("Payment verification failed");
              window.location.href = "/home";
            }
          } catch (error) {
            console.error("Error verifying payment:", error);
            // Even on error, redirect to home
            window.location.href = "/home";
          }
        },
        prefill: {
          email: userEmail ?? undefined,
        },
        notes: {
          planId: plan.id,
          upgrade: isUpgrade ? "true" : "false",
        },
        theme: {
          color: "#E50914",
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("Subscription checkout failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const statusMessage = useMemo(() => {
    if (!isActive) return null;

    if (!currentEndsAt) return "You already have an active subscription.";

    return `Active ${currentPlan ?? ""} plan until ${new Date(
      currentEndsAt
    ).toLocaleDateString()}.`;
  }, [isActive, currentPlan, currentEndsAt]);

  // Calculate upgrade discount if user has monthly and is viewing yearly
  // This will be calculated by backend, but we show it here for UI preview
  const upgradeDiscount = useMemo(() => {
    if (!isActive || !currentPlan || !currentEndsAt || plans.length === 0)
      return null;
    if (currentPlan !== "monthly") return null;

    const monthlyPlan = plansMap["monthly"];
    const yearlyPlan = plansMap["yearly"];
    if (!monthlyPlan || !yearlyPlan) return null;

    const now = new Date();
    const timeRemaining = new Date(currentEndsAt).getTime() - now.getTime();
    const daysRemaining = Math.max(
      0,
      Math.ceil(timeRemaining / (1000 * 60 * 60 * 24))
    );
    const monthsRemaining = daysRemaining / 30;

    const remainingValue = Math.round(monthlyPlan.amount * monthsRemaining);
    const discountedAmount = Math.max(0, yearlyPlan.amount - remainingValue);

    return remainingValue > 0
      ? {
          amount: discountedAmount,
          discount: remainingValue,
          originalAmount: yearlyPlan.amount,
        }
      : null;
  }, [isActive, currentPlan, currentEndsAt, plans, plansMap]);

  if (plansLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-white/70">Loading plans...</p>
      </div>
    );
  }

  if (plans.length === 0 && !plansLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <p className="text-red-400 text-lg font-semibold">
          Failed to load subscription plans
        </p>
        <p className="text-white/70 text-sm">
          The payment service may not be running. Please ensure the payment
          service is started.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {statusMessage && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <CheckCircle2 className="h-5 w-5" />
          <p>{statusMessage}</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {plans.map((plan) => {
          const isSelected = plan.id === selectedPlan;
          // Disable monthly if user already has monthly subscription
          // Disable both plans if user has yearly subscription
          const isDisabled =
            (isActive && currentPlan === "monthly" && plan.id === "monthly") ||
            (isActive && currentPlan === "yearly");
          const isUpgradeOption =
            isActive && currentPlan === "monthly" && plan.id === "yearly";
          const isCurrentYearlyPlan =
            isActive && currentPlan === "yearly" && plan.id === "yearly";

          return (
            <button
              key={plan.id}
              className={`rounded-2xl border p-6 text-left transition ${
                isDisabled
                  ? "border-gray-600 bg-gray-900/50 cursor-not-allowed opacity-50"
                  : isSelected
                    ? "border-white bg-white/5 hover:border-white"
                    : "border-white/10 hover:border-white"
              }`}
              onClick={() => !isDisabled && setSelectedPlan(plan.id)}
              type="button"
              disabled={isDisabled}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-semibold">{plan.label}</h3>
                <div className="flex gap-2">
                  {isUpgradeOption && (
                    <span className="rounded-full bg-emerald-500/20 text-emerald-400 px-3 py-1 text-xs uppercase tracking-wide border border-emerald-500/40">
                      Upgrade
                    </span>
                  )}
                  {isCurrentYearlyPlan && (
                    <span className="rounded-full bg-emerald-500/20 text-emerald-400 px-3 py-1 text-xs uppercase tracking-wide border border-emerald-500/40">
                      Your Plan
                    </span>
                  )}
                  {isDisabled && !isCurrentYearlyPlan && (
                    <span className="rounded-full bg-gray-600/20 text-gray-400 px-3 py-1 text-xs uppercase tracking-wide">
                      Current Plan
                    </span>
                  )}
                  {isSelected && !isDisabled && (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-wide">
                      Selected
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-2 text-sm text-white/70">{plan.interval}</p>
              <div className="mt-4">
                {isUpgradeOption &&
                upgradeDiscount &&
                upgradeDiscount.discount > 0 ? (
                  <>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-normal text-white/50 line-through">
                        ₹
                        {upgradeDiscount.originalAmount.toLocaleString("en-IN")}
                      </p>
                      <p className="text-4xl font-bold text-emerald-400">
                        ₹{upgradeDiscount.amount.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <p className="text-sm text-emerald-400 font-semibold mt-1">
                      Save ₹{upgradeDiscount.discount.toLocaleString("en-IN")}!
                    </p>
                  </>
                ) : (
                  <p className="text-4xl font-bold">
                    ₹{plan.amount.toLocaleString("en-IN")}
                    <span className="ml-2 text-base font-normal text-white/70">
                      {plan.interval}
                    </span>
                  </p>
                )}
              </div>
              <p className="mt-2 text-sm text-white/70">{plan.tagline}</p>
              {isUpgradeOption &&
                upgradeDiscount &&
                upgradeDiscount.discount > 0 && (
                  <p className="mt-2 text-xs text-emerald-400">
                    Discount applied based on your remaining monthly
                    subscription value
                  </p>
                )}
              <ul className="mt-6 space-y-2 text-sm text-white/80">
                {plan.perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    {perk}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {isActive &&
        currentPlan === "monthly" &&
        selectedPlan === "yearly" &&
        upgradeDiscount &&
        upgradeDiscount.discount > 0 && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            <p className="font-semibold">✨ Upgrade Discount Available!</p>
            <p className="text-xs mt-1">
              You&apos;re already enjoying all the benefits of our yearly
              subscription. Your plan is active until{" "}
              {currentEndsAt
                ? new Date(currentEndsAt).toLocaleDateString()
                : "the end of your billing period"}
              .
            </p>
            <p className="text-xs mt-1">
              Original Yearly Price: ₹
              {upgradeDiscount.originalAmount.toLocaleString("en-IN")} → Your
              Price: ₹{upgradeDiscount.amount.toLocaleString("en-IN")}
            </p>
          </div>
        )}

      {/* Only show payment button if user doesn't have yearly subscription */}
      {!(isActive && currentPlan === "yearly") && (
        <Button
          size="lg"
          className="w-full bg-red-600 text-lg hover:bg-red-500"
          onClick={handleSubscribe}
          disabled={
            !scriptReady ||
            loading ||
            (isActive &&
              currentPlan === "monthly" &&
              selectedPlan === "monthly")
          }
        >
          {loading
            ? "Processing..."
            : isActive && currentPlan === "monthly" && selectedPlan === "yearly"
              ? "Upgrade to Yearly Plan"
              : "Continue to payment"}
        </Button>
      )}

      {/* Show message for yearly subscribers */}
      {isActive && currentPlan === "yearly" && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <p className="font-semibold">✨ You&apos;re on the Yearly Plan!</p>
          <p className="text-xs mt-1">
            You&apos;re already enjoying all the benefits of our yearly
            subscription. Your plan is active until{" "}
            {currentEndsAt
              ? new Date(currentEndsAt).toLocaleDateString()
              : "the end of your billing period"}
            .
          </p>
        </div>
      )}

      {isActive && autoRenew && (
        <div className="border-t border-white/10 pt-4 space-y-2">
          <p className="text-sm text-white/70">
            Want to stop your membership? You can cancel anytime.
          </p>
          <Button
            variant="outline"
            className="w-full border-red-600 text-red-400 hover:bg-red-600/10"
            onClick={handleCancel}
            disabled={cancelLoading}
          >
            {cancelLoading ? "Cancelling..." : "Cancel membership"}
          </Button>
        </div>
      )}

      {isActive && !autoRenew && (
        <div className="border-t border-white/10 pt-4 space-y-2">
          <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
            <p className="font-semibold">Membership Cancelled</p>
            <p className="text-xs mt-1">
              Your membership has been cancelled. You can continue enjoying the
              service until{" "}
              {currentEndsAt
                ? new Date(currentEndsAt).toLocaleDateString()
                : "your subscription expires"}
              , but you will not be charged again.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
