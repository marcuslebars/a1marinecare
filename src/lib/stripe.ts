// Stripe, without the SDK. Checkout Sessions + webhook signature verification
// over plain fetch/crypto — the two calls this site makes don't justify a
// dependency, and it keeps the standalone Next bundle small.
//
// Env (Railway):
//   STRIPE_SECRET_KEY      sk_live_… / sk_test_…
//   STRIPE_WEBHOOK_SECRET  whsec_… for the endpoint POST /api/stripe/webhook
//   SHRINK_WRAP_DEPOSIT_CENTS  optional override, default 25000 ($250)

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const STRIPE_API = "https://api.stripe.com/v1";

export const DEFAULT_DEPOSIT_CENTS = 25_000;

export function getDepositCents(): number {
  const raw = Number(process.env.SHRINK_WRAP_DEPOSIT_CENTS);
  return Number.isFinite(raw) && raw >= 5_000 ? Math.round(raw) : DEFAULT_DEPOSIT_CENTS;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

function secretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return key;
}

/** Flattens nested objects/arrays into Stripe's bracketed form encoding. */
function encodeForm(input: Record<string, unknown>, prefix = ""): string[] {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item && typeof item === "object") parts.push(...encodeForm(item as Record<string, unknown>, `${name}[${index}]`));
        else parts.push(`${encodeURIComponent(`${name}[${index}]`)}=${encodeURIComponent(String(item))}`);
      });
    } else if (typeof value === "object") {
      parts.push(...encodeForm(value as Record<string, unknown>, name));
    } else {
      parts.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts;
}

async function stripeRequest<T>(method: "GET" | "POST", path: string, body?: Record<string, unknown>, idempotencyKey?: string): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey()}`,
    "Stripe-Version": "2024-06-20",
  };
  if (method === "POST") headers["Content-Type"] = "application/x-www-form-urlencoded";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers,
    body: method === "POST" && body ? encodeForm(body).join("&") : undefined,
    cache: "no-store",
  });

  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string; type?: string; code?: string } };
  if (!res.ok) {
    const message = json?.error?.message ?? `Stripe ${res.status}`;
    throw new Error(`[stripe] ${path}: ${message}`);
  }
  return json;
}

export type CheckoutSession = {
  id: string;
  url: string | null;
  status: "open" | "complete" | "expired";
  payment_status: "paid" | "unpaid" | "no_payment_required";
  amount_total: number | null;
  currency: string | null;
  customer_email: string | null;
  customer_details?: { email?: string | null; name?: string | null; phone?: string | null } | null;
  payment_intent: string | null;
  client_reference_id: string | null;
  metadata: Record<string, string>;
};

export type DepositSessionInput = {
  quoteId: string;
  leadEventId?: string | null;
  customerName: string;
  /** Omit when unknown — Stripe collects it on the Checkout page. */
  customerEmail?: string;
  description: string;
  amountCents: number;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  /**
   * How long the Checkout link stays open. Stripe allows 30 min – 24 h; the
   * link actually lives between 1× and 2× this value because expiry is
   * aligned to an idempotency bucket (see below). Web default 30; phone-sent
   * links use 720 (12–24 h) so a texted link survives a drive home.
   */
  expiresInMinutes?: number;
};

export function depositExpiryMinutes(requested: number | undefined): number {
  const m = Number.isFinite(requested) ? Math.round(requested as number) : 30;
  return Math.min(Math.max(m, 30), 720);
}

/** Short stable hash of everything that varies per caller, for the idempotency key. */
export function paramsFingerprint(input: DepositSessionInput, metadata: Record<string, string>): string {
  const basis = JSON.stringify({ e: input.customerEmail ?? "", n: input.customerName, d: input.description, a: input.amountCents, s: input.successUrl, c: input.cancelUrl, m: metadata });
  return createHash("sha256").update(basis).digest("hex").slice(0, 12);
}

export async function createDepositCheckoutSession(input: DepositSessionInput): Promise<CheckoutSession> {
  const minutes = depositExpiryMinutes(input.expiresInMinutes);
  const bucketMs = minutes * 60 * 1000;
  const bucket = Math.floor(Date.now() / bucketMs);
  const metadata = {
    kind: "shrink-wrap-deposit",
    quoteId: input.quoteId,
    leadEventId: input.leadEventId ?? "",
    customerName: input.customerName,
    ...(input.metadata ?? {}),
  };

  return stripeRequest<CheckoutSession>(
    "POST",
    "/checkout/sessions",
    {
      mode: "payment",
      customer_email: input.customerEmail?.trim() || undefined,
      customer_creation: "always",
      phone_number_collection: { enabled: true },
      submit_type: "book",
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.quoteId,
      metadata,
      payment_intent_data: {
        description: input.description,
        metadata,
        statement_descriptor_suffix: "SHRINKWRAP",
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "cad",
            unit_amount: input.amountCents,
            product_data: {
              name: "Shrink Wrap Deposit — A1 Marine Care",
              description: input.description,
            },
          },
        },
      ],
      // Expiry is aligned to the idempotency bucket below so a retry inside
      // the bucket sends byte-identical params (Stripe rejects an idempotent
      // replay whose params differ). Lives between 1× and 2× expiresInMinutes.
      expires_at: Math.floor(((bucket + 2) * bucketMs) / 1000),
    },
    // Same quote + same params → same session while it's still open, so a
    // retry from a flaky network doesn't create duplicates. The params hash
    // keeps different channels (quote email, Marina mid-call, post-call text,
    // nudge) from colliding: Stripe rejects a key reused with different params.
    `deposit-${input.quoteId}-${minutes}-${bucket}-${paramsFingerprint(input, metadata)}`,
  );
}

export async function retrieveCheckoutSession(id: string): Promise<CheckoutSession> {
  return stripeRequest<CheckoutSession>("GET", `/checkout/sessions/${encodeURIComponent(id)}`);
}

export type StripeEvent<T = unknown> = {
  id: string;
  type: string;
  created: number;
  livemode: boolean;
  data: { object: T };
};

/**
 * Verifies a `Stripe-Signature` header against the raw request body.
 * Mirrors stripe-node's constructEvent: v1 = HMAC-SHA256(`${t}.${payload}`),
 * timestamp within tolerance, constant-time compare.
 */
export function verifyStripeWebhook(rawBody: string, signatureHeader: string | null, secret: string, toleranceSeconds = 300): StripeEvent {
  if (!signatureHeader) throw new Error("Missing Stripe-Signature header");

  const parts = signatureHeader.split(",").map((p) => p.trim());
  const timestamp = parts.find((p) => p.startsWith("t="))?.slice(2);
  const signatures = parts.filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!timestamp || signatures.length === 0) throw new Error("Malformed Stripe-Signature header");

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) throw new Error("Stripe signature timestamp outside tolerance");

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const ok = signatures.some((sig) => {
    const sigBuf = Buffer.from(sig, "hex");
    return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf);
  });
  if (!ok) throw new Error("Stripe signature mismatch");

  return JSON.parse(rawBody) as StripeEvent;
}
