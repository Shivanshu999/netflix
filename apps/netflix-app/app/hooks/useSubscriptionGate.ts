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
      // Retry logic: sometimes subscription activation takes a moment after payment
      let retries = 3;
      let lastError: any = null;

      while (retries > 0) {
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

          if (data.active) {
            return true;
          }

          // If not active and this is the last retry, redirect to subscribe
          if (retries === 1) {
            router.push("/subscribe");
            return false;
          }

          // Wait before retry (only if not active and we have retries left)
          await new Promise((resolve) => setTimeout(resolve, 1000));
          retries--;
        } catch (error) {
          lastError = error;
          // If we have retries left, wait and retry
          if (retries > 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            retries--;
          } else {
            throw error;
          }
        }
      }

      // If we exhausted retries and still not active
      router.push("/subscribe");
      return false;
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

















