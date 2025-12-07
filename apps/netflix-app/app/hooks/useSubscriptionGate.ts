"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

type SubscriptionCheckResponse = {
  active: boolean;
};

export function useSubscriptionGate() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  const ensureSubscribed = useCallback(async (): Promise<boolean> => {
    setChecking(true);

    try {
      const response = await fetch("/api/subscription/status", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (response.status === 401) {
        router.push("/");
        return false;
      }

      const data = (await response.json()) as SubscriptionCheckResponse;

      if (!data.active) {
        router.push("/subscribe");
        return false;
      }

      return true;
    } catch (error) {
      console.error("Subscription check failed", error);
      router.refresh();
      return false;
    } finally {
      setChecking(false);
    }
  }, [router]);

  return { ensureSubscribed, checking };
}













