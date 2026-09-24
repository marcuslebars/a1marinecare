import { NextResponse } from "next/server";
import { z } from "zod";

import { company } from "@/content/site";
import { getQuoteLead } from "@/lib/leads";
import { createDepositCheckoutSession, getDepositCents, isStripeConfigured } from "@/lib/stripe";
import { isDepositPaid } from "@/lib/retell/caller-lookup";
import { PHONE_LINK_MINUTES } from "@/lib/retell/deposit-link";
import { formatCents } from "@/lib/shrink-wrap-pricing";

export const runtime = "nodejs";

const bodySchema = z.object({
  quoteId: z.string().trim().min(8).max(80),
  eventId: z.string().trim().max(80).optional(),
});

const ALLOWED_HOSTS = new Set(["a1marinecare.ca", "www.a1marinecare.ca", "localhost:3000"]);

/** The origin to send the customer back to after Stripe — same host they came from. */
function resolveOrigin(request: Request): string {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const url = new URL(origin);
      if (ALLOWED_HOSTS.has(url.host)) return `${url.protocol}//${url.host}`;
    } catch {
      /* fall through */
    }
  }
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host && ALLOWED_HOSTS.has(host)) return `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  return company.url;
}

/**
 * POST /api/shrink-wrap/deposit — turns a quote into a Stripe Checkout session
 * for the booking deposit. Everything about the charge (amount, who, what) is
 * derived server-side from the stored quote; the client only names the quote.
 */
export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ success: false, error: "Online deposits aren't available right now — call us and we'll hold your spot." }, { status: 503 });
  }

  let input: z.infer<typeof bodySchema>;
  try {
    input = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request data." }, { status: 400 });
  }

  const quote = await getQuoteLead(input.quoteId).catch((err) => {
    console.error("[Deposit API] quote lookup failed:", err instanceof Error ? err.message : String(err));
    return null;
  });

  if (!quote || quote.metadata?.formType !== "shrink-wrap-quote") {
    return NextResponse.json({ success: false, error: "We couldn't find that quote. Please request a new one." }, { status: 404 });
  }

  if (await isDepositPaid(input.quoteId)) {
    return NextResponse.json({ success: false, error: "Good news — this quote's deposit is already paid and your spot is held." }, { status: 409 });
  }

  const origin = resolveOrigin(request);
  const amountCents = getDepositCents();
  const boat = `${quote.boatLength} ft ${quote.boatType}`;
  const quotedTotal = typeof quote.estimatedTotal === "number" ? formatCents(quote.estimatedTotal) : null;
  const description = `Holds your mobile shrink wrap date for the ${boat}${quotedTotal ? ` (quoted ${quotedTotal} + HST)` : ""}. Applied in full to your final invoice.`;

  try {
    const session = await createDepositCheckoutSession({
      quoteId: input.quoteId,
      customerName: quote.contactName,
      customerEmail: quote.contactEmail,
      description,
      amountCents,
      expiresInMinutes: PHONE_LINK_MINUTES,
      successUrl: `${origin}/shrink-wrapping/deposit/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/shrink-wrapping?deposit=cancelled&quoteId=${encodeURIComponent(input.quoteId)}#quote`,
      metadata: {
        boat,
        locationSlug: quote.locationSlug,
        quotedSubtotalCents: String(quote.estimatedTotal ?? ""),
        metaEventId: input.eventId ?? "",
        utm: JSON.stringify((quote.metadata?.utm as Record<string, string> | undefined) ?? {}).slice(0, 500),
      },
    });

    if (!session.url) throw new Error("Stripe returned no checkout URL");

    console.log("[Deposit API] checkout session created:", session.id, "quote:", input.quoteId);
    return NextResponse.json({ success: true, url: session.url, sessionId: session.id, amountCents });
  } catch (err) {
    console.error("[Deposit API] session create failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ success: false, error: "We couldn't start the payment. Call us and we'll hold your spot by phone." }, { status: 502 });
  }
}
