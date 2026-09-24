import { Resend } from "resend";

import { company } from "@/content/site";
import { getQuoteLead } from "@/lib/leads";
import { createDepositCheckoutSession, getDepositCents, isStripeConfigured } from "@/lib/stripe";
import { formatCents } from "@/lib/shrink-wrap-pricing";

import { isPlaceholderEmail, normalizePhone } from "./auth";

// Marina can't take a card over the phone (and shouldn't — PCI). She sends the
// caller the same Stripe Checkout link the website uses, by text while they're
// still on the line, with email as a backup. The existing Stripe webhook records
// the paid deposit exactly as it does for the web flow.

export function isSmsConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
}

export async function sendSms(to: string, body: string): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) return { ok: false, error: "sms_not_configured" };
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
    if (!res.ok) return { ok: false, error: json.message ?? `twilio ${res.status}` };
    return { ok: true, sid: json.sid };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function sendDepositEmail(to: string, firstName: string, url: string, amountLabel: string, boat: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "email_not_configured" };
  const from = process.env.FROM_EMAIL || "A1 Marine Care <noreply@a1marinecare.ca>";
  try {
    const resend = new Resend(apiKey);
    const res = await resend.emails.send({
      from,
      to,
      replyTo: company.email,
      subject: `Hold your shrink wrap date — ${amountLabel} deposit`,
      html: `<div style="font-family:Inter,Arial,sans-serif;font-size:16px;line-height:1.6;color:#111">
        <p>Hi ${firstName},</p>
        <p>Thanks for calling A1 Marine Care. Here's the link to lock in your shrink wrap date for the ${boat} with a ${amountLabel} deposit — it comes straight off your final invoice.</p>
        <p><a href="${url}" style="display:inline-block;padding:12px 20px;background:#0ea5e9;color:#fff;border-radius:10px;text-decoration:none;font-weight:700">Pay ${amountLabel} &amp; hold my spot</a></p>
        <p style="font-size:13px;color:#667">The link is good for 30 minutes. If it expires, reply to this email or call ${company.phone} and we'll send a fresh one.</p>
        <p>— Marina, A1 Marine Care</p>
      </div>`,
    });
    if (res.error) return { ok: false, error: res.error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export type DepositLinkResult =
  | { ok: true; sentBy: Array<"sms" | "email">; sentTo: { sms?: string; email?: string }; amountLabel: string; expiresMinutes: number; sessionId: string; url: string }
  | { ok: false; reason: "quote_not_found" | "stripe_unavailable" | "no_channel" | "send_failed"; say: string };

export async function sendDepositLinkForQuote(input: { quoteId: string; phoneOverride?: string | null; emailOverride?: string | null; retellCallId?: string | null }): Promise<DepositLinkResult> {
  if (!isStripeConfigured()) {
    return { ok: false, reason: "stripe_unavailable", say: "Online deposits are down for a moment — Marcus will hold the spot by phone and follow up." };
  }
  const quote = await getQuoteLead(input.quoteId).catch(() => null);
  if (!quote || quote.metadata?.formType !== "shrink-wrap-quote") {
    return { ok: false, reason: "quote_not_found", say: "I couldn't find that quote on my end. Let me redo it quickly." };
  }

  const phone = normalizePhone(input.phoneOverride) ?? normalizePhone(quote.contactPhone);
  const email = input.emailOverride?.trim() || (isPlaceholderEmail(quote.contactEmail) ? null : quote.contactEmail);
  if (!phone && !email) {
    return { ok: false, reason: "no_channel", say: "I need a mobile number or an email to send the link to." };
  }

  const amountCents = getDepositCents();
  const amountLabel = formatCents(amountCents);
  const boat = `${quote.boatLength} ft ${quote.boatType}`;
  const quotedTotal = typeof quote.estimatedTotal === "number" ? formatCents(quote.estimatedTotal) : null;
  const origin = company.url;

  let session: { id: string; url: string | null };
  try {
    session = await createDepositCheckoutSession({
      quoteId: input.quoteId,
      customerName: quote.contactName,
      customerEmail: email ?? undefined,
      description: `Holds your mobile shrink wrap date for the ${boat}${quotedTotal ? ` (quoted ${quotedTotal} + HST)` : ""}. Applied in full to your final invoice.`,
      amountCents,
      successUrl: `${origin}/shrink-wrapping/deposit/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/shrink-wrapping?deposit=cancelled&quoteId=${encodeURIComponent(input.quoteId)}#quote`,
      metadata: {
        boat,
        locationSlug: quote.locationSlug,
        quotedSubtotalCents: String(quote.estimatedTotal ?? ""),
        channel: "marina",
        retellCallId: input.retellCallId ?? "",
        utm: JSON.stringify({ utm_source: "marina", utm_medium: "phone" }),
      },
    });
  } catch (err) {
    console.error("[Marina deposit] session create failed:", err instanceof Error ? err.message : String(err));
    return { ok: false, reason: "stripe_unavailable", say: "I couldn't generate the payment link just now — Marcus will hold the spot and send it himself." };
  }
  if (!session.url) return { ok: false, reason: "stripe_unavailable", say: "I couldn't generate the payment link just now — Marcus will hold the spot and send it himself." };

  const firstName = quote.contactName.split(" ")[0] || "there";
  const sentBy: Array<"sms" | "email"> = [];
  const sentTo: { sms?: string; email?: string } = {};

  if (phone && isSmsConfigured()) {
    const sms = await sendSms(phone, `A1 Marine Care: hold your shrink wrap date for the ${boat} with a ${amountLabel} deposit (comes off your invoice): ${session.url} — link is good for 30 min. Questions? ${company.phone}`);
    if (sms.ok) {
      sentBy.push("sms");
      sentTo.sms = phone;
    } else {
      console.error("[Marina deposit] sms failed:", sms.error);
    }
  }
  if (email) {
    const mail = await sendDepositEmail(email, firstName, session.url, amountLabel, boat);
    if (mail.ok) {
      sentBy.push("email");
      sentTo.email = email;
    } else {
      console.error("[Marina deposit] email failed:", mail.error);
    }
  }

  if (!sentBy.length) {
    return { ok: false, reason: "send_failed", say: "The link didn't go through. Marcus will send it to you directly and hold your spot in the meantime." };
  }

  console.log("[Marina deposit] link sent", { quoteId: input.quoteId, sessionId: session.id, sentBy, retellCallId: input.retellCallId ?? null });
  return { ok: true, sentBy, sentTo, amountLabel, expiresMinutes: 30, sessionId: session.id, url: session.url };
}
