import { NextResponse } from "next/server";

import { getLocationBySlug } from "@/content/site";
import { prisma } from "@/lib/db/prisma";
import { sendToCrm } from "@/lib/crm-webhook";
import { createLeadEvent, isMissingTableError, sendLeadNotificationEmail, updateLeadEventStatus } from "@/lib/lead-events";
import { getQuoteLead } from "@/lib/leads";
import { formatCents } from "@/lib/shrink-wrap-pricing";
import { verifyStripeWebhook, type CheckoutSession, type StripeEvent } from "@/lib/stripe";
import { sendSms } from "@/lib/retell/deposit-link";
import { ownerSmsNumber } from "@/lib/retell/webhook";
import { WINDOWS, spokenLabel, type Window } from "@/lib/retell/slots";

export const runtime = "nodejs";
// Stripe signs the exact bytes — never let Next parse/re-serialize the body.
export const dynamic = "force-dynamic";

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function row(label: string, value: string) {
  return `<tr><td style="padding:0 0 16px;vertical-align:top;width:50%;"><div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(229,237,245,0.45);font-weight:700;">${label}</div><div style="margin-top:6px;font-size:16px;color:#ffffff;font-weight:600;">${escapeHtml(value)}</div></td>`;
}

async function alreadyRecorded(sessionId: string): Promise<boolean> {
  try {
    const existing = await prisma.leadEvent.findFirst({
      where: { leadType: "shrink-wrap-deposit", metadata: { path: ["stripeSessionId"], equals: sessionId } },
      select: { id: true },
    });
    return Boolean(existing);
  } catch (err) {
    if (isMissingTableError(err)) return false;
    console.error("[Stripe webhook] idempotency lookup failed:", err instanceof Error ? err.message : String(err));
    return false;
  }
}

async function handleDepositPaid(session: CheckoutSession, event: StripeEvent) {
  if (session.metadata?.kind !== "shrink-wrap-deposit") return;
  if (session.payment_status !== "paid") {
    console.log("[Stripe webhook] session completed but unpaid:", session.id, session.payment_status);
    return;
  }
  if (await alreadyRecorded(session.id)) {
    console.log("[Stripe webhook] duplicate delivery ignored:", session.id);
    return;
  }

  const quoteId = session.metadata.quoteId || session.client_reference_id || "";
  const quote = quoteId ? await getQuoteLead(quoteId).catch(() => null) : null;

  const name = quote?.contactName || session.customer_details?.name || session.metadata.customerName || "Unknown";
  const email = quote?.contactEmail || session.customer_details?.email || session.customer_email || "";
  const phone = session.customer_details?.phone || quote?.contactPhone || "";
  const amountCents = session.amount_total ?? 0;
  const boat = session.metadata.boat || (quote ? `${quote.boatLength} ft ${quote.boatType}` : "");
  const locationSlug = session.metadata.locationSlug || quote?.locationSlug || "";
  const location = locationSlug ? getLocationBySlug(locationSlug) : null;
  const locationLabel = location ? `${location.name}, ${location.region}` : locationSlug || "Not given";
  const quotedCents = Number(session.metadata.quotedSubtotalCents) || (typeof quote?.estimatedTotal === "number" ? quote.estimatedTotal : 0);
  let utm: Record<string, string> = {};
  try {
    utm = session.metadata.utm ? (JSON.parse(session.metadata.utm) as Record<string, string>) : {};
  } catch {
    utm = {};
  }

  let leadEventId: string | null = null;
  try {
    const record = await createLeadEvent({
      source: "booking",
      customerName: name,
      email,
      phone,
      serviceInterest: "Shrink Wrapping — deposit paid",
      boatLength: quote?.boatLength,
      boatType: quote?.boatType,
      locationSlug: locationSlug || undefined,
      message: quote?.notes ?? undefined,
      leadId: quoteId || undefined,
      leadType: "shrink-wrap-deposit",
      rawPayload: { stripeEventId: event.id, session: { id: session.id, amount_total: session.amount_total, currency: session.currency, payment_intent: session.payment_intent } },
      metadata: {
        formType: "shrink-wrap-deposit",
        stripeSessionId: session.id,
        stripePaymentIntent: session.payment_intent,
        depositCents: amountCents,
        quotedSubtotalCents: quotedCents,
        quoteId,
        utm,
        livemode: event.livemode,
      },
    });
    leadEventId = record.id;
    await updateLeadEventStatus(record.id, "booked").catch(() => {});
  } catch (err) {
    if (isMissingTableError(err)) console.warn("[Stripe webhook] lead_events table unavailable.");
    else console.error("[Stripe webhook] lead event save failed:", err instanceof Error ? err.message : String(err));
  }

  const emailResult = await sendLeadNotificationEmail(leadEventId ?? "", {
    subject: `💰 DEPOSIT PAID ${formatCents(amountCents)} — ${name} · ${boat}${event.livemode ? "" : " · TEST"}`,
    replyTo: email || undefined,
    html: `
      <div style="margin:0;padding:32px;background:#02070c;font-family:Inter,Arial,sans-serif;color:#e5edf5;">
        <div style="max-width:720px;margin:0 auto;background:#07131d;border:1px solid rgba(255,255,255,0.08);border-radius:24px;overflow:hidden;">
          <div style="padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.08);background:linear-gradient(180deg,#0b2a1c 0%,#06101a 100%);">
            <div style="font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#4ade80;font-weight:700;">A1 Marine Care · Shrink Wrap · Deposit</div>
            <h1 style="margin:14px 0 0;font-size:28px;line-height:1.2;color:#ffffff;">${formatCents(amountCents)} deposit received</h1>
            <p style="margin:12px 0 0;font-size:15px;color:rgba(229,237,245,0.72);">This customer has paid to hold a spot. Call today and put them on the calendar.</p>
          </div>
          <div style="padding:32px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>${row("Name", name)}${row("Phone", phone || "Not given")}</tr>
              <tr>${row("Email", email || "Not given")}${row("Area", locationLabel)}</tr>
              <tr>${row("Boat", boat || "Not given")}${row("Quoted (before HST)", quotedCents ? formatCents(quotedCents) : "See quote")}</tr>
              <tr>${row("Deposit", `${formatCents(amountCents)} — applied to final invoice`)}${row("Balance due on the day", quotedCents ? `${formatCents(Math.max(quotedCents - amountCents, 0))} + HST` : "Quoted total − deposit + HST")}</tr>
            </table>
            ${quote?.notes ? `<div style="margin-top:8px;padding:20px 24px;border-radius:20px;background:#02070c;border:1px solid rgba(255,255,255,0.06);"><div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(229,237,245,0.45);font-weight:700;">Notes from the quote</div><div style="margin-top:10px;font-size:15px;line-height:1.7;">${escapeHtml(quote.notes).replace(/\n/g, "<br />")}</div></div>` : ""}
            <div style="margin-top:20px;font-size:12px;color:rgba(229,237,245,0.5);">
              Stripe session ${escapeHtml(session.id)} · Payment ${escapeHtml(session.payment_intent ?? "n/a")} · Quote ${escapeHtml(quoteId || "n/a")} · Lead ${leadEventId ?? "n/a"}${Object.keys(utm).length ? ` · ${escapeHtml(Object.entries(utm).map(([k, v]) => `${k}=${v}`).join(" "))}` : ""}
            </div>
          </div>
        </div>
      </div>
    `,
  });
  if (!emailResult.success) {
    console.error(JSON.stringify({ level: "email_failure", source: "stripe-deposit", leadEventId, error: emailResult.error }));
  }

  sendToCrm({
    source: "booking",
    leadTag: "a1marinecare-shrink-wrap-deposit",
    name,
    email,
    phone,
    service: `Shrink Wrapping — ${formatCents(amountCents)} deposit PAID`,
    boatLength: quote?.boatLength,
    marina: locationLabel,
    notes: [
      `Deposit ${formatCents(amountCents)} paid via Stripe (${session.payment_intent ?? session.id}).`,
      quotedCents ? `Quoted ${formatCents(quotedCents)} + HST; balance ${formatCents(Math.max(quotedCents - amountCents, 0))} + HST on the day.` : "",
      boat ? `Boat: ${boat}` : "",
      quote?.notes ?? "",
    ]
      .filter(Boolean)
      .join("\n"),
    utm,
  });

  console.log("[Stripe webhook] deposit recorded:", session.id, name, formatCents(amountCents), "lead:", leadEventId);

  // Text the owner the moment money lands.
  const owner = ownerSmsNumber();
  if (owner) {
    let when = "no date yet — call to book";
    if (quoteId) {
      try {
        const b = await prisma.bookingRequest.findFirst({ where: { quoteId, NOT: { status: { in: ["cancelled", "canceled", "declined"] } } }, orderBy: { date: "asc" }, select: { date: true, timeSlot: true } });
        if (b) {
          const w: Window = WINDOWS.afternoon.slots.includes(b.timeSlot) ? "afternoon" : "morning";
          when = spokenLabel(b.date, w);
        }
      } catch {
        /* best-effort */
      }
    }
    const via = session.metadata.channel === "marina" ? " (via Marina)" : "";
    const res = await sendSms(owner, `💰 ${name} paid the ${formatCents(amountCents)} deposit${via} · ${boat || "boat n/a"} · ${when}${quotedCents ? ` · quoted ${formatCents(quotedCents)}` : ""}${event.livemode ? "" : " · TEST"}`);
    if (!res.ok) console.error("[Stripe webhook] owner sms failed:", res.error);
  }
}

/**
 * POST /api/stripe/webhook — Stripe → us. Register this URL in the Stripe
 * dashboard for `checkout.session.completed` and
 * `checkout.session.async_payment_succeeded`, and put the signing secret in
 * STRIPE_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error("[Stripe webhook] STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  let event: StripeEvent<CheckoutSession>;
  try {
    event = verifyStripeWebhook(rawBody, request.headers.get("stripe-signature"), secret) as StripeEvent<CheckoutSession>;
  } catch (err) {
    console.error("[Stripe webhook] signature rejected:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await handleDepositPaid(event.data.object, event);
        break;
      case "checkout.session.async_payment_failed":
        console.warn("[Stripe webhook] async payment failed:", event.data.object.id);
        break;
      default:
        // Not ours to handle; acknowledge so Stripe stops retrying.
        break;
    }
  } catch (err) {
    // 500 → Stripe retries with backoff, which is what we want for a transient DB/email failure.
    console.error("[Stripe webhook] handler failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
