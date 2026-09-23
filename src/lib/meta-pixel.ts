"use client";

// Meta (Facebook) Pixel for a1marinecare.ca.
//
// Ported from the A1 Marine Storage site (client/src/lib/meta-pixel.ts) when the
// storage brand was folded into Marine Care. Same shape: init once, PageView on
// every route change (Next's App Router does client navigations the raw snippet
// would miss), and a small `trackPixelEvent` for standard events.
//
// The pixel ID is a public client-side id. It defaults to the pixel that was
// running on a1marinestorage.ca — so the retargeting audiences built there
// carry over — and can be overridden with NEXT_PUBLIC_META_PIXEL_ID.
//
// Only initialised in production builds so local dev never pollutes the pixel.

const PIXEL_ID = (process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "").trim() || "2437586250097446";

interface Fbq {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: unknown;
  loaded: boolean;
  version: string;
}

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

let ready = false;

function enabled(): boolean {
  if (typeof window === "undefined" || !PIXEL_ID) return false;
  if (process.env.NODE_ENV !== "production") return false;
  return true;
}

/** Inject fbevents.js once and init the pixel. Safe to call repeatedly. */
export function initMetaPixel(): void {
  if (ready || !enabled()) return;

  if (!window.fbq) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod.call(fbq, ...args);
      else fbq.queue.push(args);
    } as Fbq;
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.push = fbq;
    window.fbq = fbq;
    window._fbq = window._fbq ?? fbq;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }

  window.fbq?.("init", PIXEL_ID);
  ready = true;
}

/** PageView — call on every route change (including the first). */
export function trackPixelPageView(): void {
  if (!ready || !window.fbq) return;
  window.fbq("track", "PageView");
}

/**
 * Fire a Meta standard event (e.g. "Lead"). NEVER pass PII in params.
 * `eventId` is the dedup key if a server-side Conversions API mirror is added
 * later — send the same id from both sides and Meta counts it once.
 */
export function trackPixelEvent(event: string, params?: Record<string, unknown>, eventId?: string): void {
  if (!ready || !window.fbq) return;
  if (eventId) window.fbq("track", event, params ?? {}, { eventID: eventId });
  else window.fbq("track", event, params ?? {});
}

export function metaPixelEnabled(): boolean {
  return ready;
}

/** A random id for event dedup — works without crypto.randomUUID (older Safari). */
export function newEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
