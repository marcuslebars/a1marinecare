"use client";

import { useEffect } from "react";

import { trackPixelEvent } from "@/lib/meta-pixel";

/**
 * Fires the paid-deposit conversion once per session id. Lives on the Stripe
 * success page, which the customer only reaches after paying, so `Purchase`
 * here means real money — Ads Manager can optimise on it directly.
 */
export function DepositConversion({ sessionId, amountCents }: { sessionId: string; amountCents: number }) {
  useEffect(() => {
    if (!sessionId) return;
    const key = `a1mc_deposit_tracked_${sessionId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* private mode — fire anyway */
    }

    const value = amountCents / 100;
    trackPixelEvent(
      "Purchase",
      { content_name: "shrink-wrap-deposit", content_category: "shrink-wrapping", value, currency: "CAD", num_items: 1 },
      `deposit-${sessionId}`,
    );
    const w = window as unknown as { gtag?: (...a: unknown[]) => void };
    if (typeof w.gtag === "function") {
      w.gtag("event", "purchase", {
        transaction_id: sessionId,
        currency: "CAD",
        value,
        items: [{ item_id: "shrink-wrap-deposit", item_name: "Shrink Wrap Deposit", price: value, quantity: 1 }],
      });
    }
  }, [sessionId, amountCents]);

  return null;
}
