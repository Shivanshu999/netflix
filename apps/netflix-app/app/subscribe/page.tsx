import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SubscribeClient } from "./SubscribeClient";

export default async function SubscribePage() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user) {
    redirect("/");
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });

  const isActive: boolean =
    Boolean(subscription?.isActive) &&
    Boolean(subscription?.expiresAt) &&
    (subscription?.expiresAt ? subscription.expiresAt > new Date() : false);

  return (
    <div className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-red-400">
            Membership
          </p>
          <h1 className="mt-2 text-4xl font-bold">
            {subscription?.planId === "yearly" && Boolean(subscription?.isActive) && subscription?.expiresAt && subscription.expiresAt > new Date()
              ? "Your Subscription"
              : "Choose your plan"}
          </h1>
          <p className="mt-2 text-white/70">
            {subscription?.planId === "yearly" && Boolean(subscription?.isActive) && subscription?.expiresAt && subscription.expiresAt > new Date()
              ? "View your current plan benefits and manage your subscription."
              : "Pick a plan to start watching instantly. You can cancel or change plans anytime."}
          </p>
        </div>

        <SubscribeClient
          userEmail={user.email}
          isActive={isActive}
          currentPlan={subscription?.planId ?? null}
          currentEndsAt={subscription?.expiresAt?.toISOString() ?? null}
          autoRenew={subscription?.autoRenew ?? true}
        />
      </div>
    </div>
  );
}




