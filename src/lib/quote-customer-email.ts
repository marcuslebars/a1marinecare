import { Resend } from "resend";

import { company } from "@/content/site";
import { isPlaceholderEmail } from "@/lib/retell/auth";
import { markDepositLinkSent } from "@/lib/retell/caller-lookup";
import { PHONE_LINK_MINUTES } from "@/lib/retell/deposit-link";
import { formatCents, type ShrinkWrapLineItem } from "@/lib/shrink-wrap-pricing";
import { createDepositCheckoutSession, getDepositCents, isStripeConfigured } from "@/lib/stripe";

// The email a customer gets the moment they submit the shrink-wrap quote form:
// deposit button first, booking link second, then their quote breakdown.
// Fire-and-forget from the API route; a failure here never affects the form.

export type QuoteCustomerEmailInput = {
  quoteId: string;
  contactName: string;
  contactEmail: string;
  lengthFt: number;
  hullType: string;
  winterizationLabel: string | null;
  lineItems: ShrinkWrapLineItem[];
  subtotalCents: number;
  requiresManualReview: boolean;
  utm?: Record<string, string>;
};

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function button(href: string, label: string, primary: boolean) {
  const bg = primary ? "#0ea5e9" : "#111827";
  return `<a href="${href}" style="display:inline-block;padding:14px 22px;background:${bg};color:#ffffff;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;">${label}</a>`;
}

export function buildQuoteCustomerEmail(input: QuoteCustomerEmailInput, depositUrl: string | null, bookingUrl: string): { subject: string; html: string } {
  const firstName = input.contactName.split(" ")[0] || "there";
  const boat = `${input.lengthFt} ft ${input.hullType === "other" ? "boat" : input.hullType}`;
  const deposit = formatCents(getDepositCents());
  const total = formatCents(input.subtotalCents);
  const rows = input.lineItems
    .map((i) => `<tr><td style="padding:8px 0;color:#374151;">${escapeHtml(i.label)}<div style="font-size:12px;color:#6b7280;">${escapeHtml(i.description)}</div></td><td style="padding:8px 0;text-align:right;font-weight:600;white-space:nowrap;">${formatCents(i.amountCents)}</td></tr>`)
    .join("");

  const subject = input.requiresManualReview ? `Your shrink wrap quote for the ${boat} — Marcus will confirm the price` : `Your shrink wrap quote: ${total} + HST for the ${boat}`;

  const stepDeposit = depositUrl
    ? `<div style="margin:0 0 18px;padding:20px;border:2px solid #0ea5e9;border-radius:16px;background:#f0f9ff;">
        <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#0369a1;font-weight:700;">Step 1 — hold your spot</div>
        <p style="margin:8px 0 14px;font-size:15px;line-height:1.6;color:#111827;">October fills up fast. A ${deposit} deposit locks in your date and comes straight off the ${total} — it's not extra.</p>
        ${button(depositUrl, `Pay ${deposit} &amp; hold my spot`, true)}
        <p style="margin:12px 0 0;font-size:12px;color:#6b7280;">Secure checkout by Stripe. Link is good for the next 12 hours; if it expires, reply to this email for a fresh one.</p>
      </div>`
    : `<div style="margin:0 0 18px;padding:20px;border:2px solid #f59e0b;border-radius:16px;background:#fffbeb;">
        <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#b45309;font-weight:700;">Step 1 — we'll confirm the price</div>
        <p style="margin:8px 0 0;font-size:15px;line-height:1.6;color:#111827;">This one's outside what the calculator prices automatically, so Marcus will call you with the exact number. Pick a date below and we'll pencil it in meanwhile.</p>
      </div>`;

  const html = `<div style="margin:0;padding:24px;background:#f3f4f6;font-family:Inter,Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;">
      <div style="padding:24px 28px;background:#02070c;color:#ffffff;">
        <div style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#67f0ff;font-weight:700;">A1 Marine Care · Mobile Shrink Wrap</div>
        <h1 style="margin:10px 0 0;font-size:24px;line-height:1.25;">Hi ${escapeHtml(firstName)} — here's your quote.</h1>
        <p style="margin:8px 0 0;font-size:15px;color:rgba(255,255,255,0.75);">${escapeHtml(boat)}${input.winterizationLabel ? ` · winterization (${escapeHtml(input.winterizationLabel)})` : ""}. We come to the boat — driveway, trailer, or storage lot.</p>
      </div>
      <div style="padding:24px 28px;">
        ${stepDeposit}
        <div style="margin:0 0 22px;padding:20px;border:1px solid #e5e7eb;border-radius:16px;">
          <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#4b5563;font-weight:700;">Step 2 — pick your wrap date</div>
          <p style="margin:8px 0 14px;font-size:15px;line-height:1.6;color:#111827;">Choose a morning or afternoon that works. Marcus texts the day before to confirm the arrival time.</p>
          ${button(bookingUrl, "Pick my wrap date", false)}
        </div>
        <div style="padding:20px;border-radius:16px;background:#f9fafb;">
          <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#4b5563;font-weight:700;">Your quote</div>
          <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:15px;">${rows}
            <tr><td style="padding:12px 0 0;border-top:1px solid #e5e7eb;font-weight:700;">Total</td><td style="padding:12px 0 0;border-top:1px solid #e5e7eb;text-align:right;font-weight:700;font-size:18px;">${total} <span style="font-size:12px;font-weight:500;color:#6b7280;">+ HST</span></td></tr>
          </table>
        </div>
        <div style="margin-top:22px;font-size:14px;line-height:1.7;color:#374151;">
          <strong>What's included:</strong> built-up support frame with a peaked ridge, commercial white heat-shrink film, vents, belly band and strapping. Towers, arches and outboards are framed around. The boat needs to be out of the water — on the trailer, in the driveway, or at the lot.
        </div>
        <p style="margin:22px 0 0;font-size:14px;color:#374151;">Questions? Reply to this email or call <a href="tel:${company.phone.replace(/\D/g, "")}" style="color:#0369a1;">${company.phone}</a> — Marina or Marcus will pick up.</p>
        <p style="margin:18px 0 0;font-size:12px;color:#9ca3af;">Quote ${escapeHtml(input.quoteId)} · ${escapeHtml(company.legalName)} · ${escapeHtml(company.addressLocality)}, ${escapeHtml(company.addressRegion)}</p>
      </div>
    </div>
  </div>`;

  return { subject, html };
}

export async function sendQuoteCustomerEmail(input: QuoteCustomerEmailInput): Promise<{ sent: boolean; depositUrl: string | null; error?: string }> {
  if (!input.contactEmail || isPlaceholderEmail(input.contactEmail)) return { sent: false, depositUrl: null, error: "no_email" };
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, depositUrl: null, error: "email_not_configured" };

  const origin = company.url;
  const bookingUrl = `${origin}/booking?quoteId=${encodeURIComponent(input.quoteId)}`;

  let depositUrl: string | null = null;
  if (isStripeConfigured() && !input.requiresManualReview) {
    try {
      const boat = `${input.lengthFt} ft ${input.hullType}`;
      const session = await createDepositCheckoutSession({
        quoteId: input.quoteId,
        customerName: input.contactName,
        customerEmail: input.contactEmail,
        description: `Holds your mobile shrink wrap date for the ${boat} (quoted ${formatCents(input.subtotalCents)} + HST). Applied in full to your final invoice.`,
        amountCents: getDepositCents(),
        expiresInMinutes: PHONE_LINK_MINUTES,
        successUrl: `${origin}/shrink-wrapping/deposit/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/shrink-wrapping?deposit=cancelled&quoteId=${encodeURIComponent(input.quoteId)}#quote`,
        metadata: {
          boat,
          quotedSubtotalCents: String(input.subtotalCents),
          channel: "quote-email",
          utm: JSON.stringify(input.utm ?? {}).slice(0, 500),
        },
      });
      depositUrl = session.url ?? null;
    } catch (err) {
      console.error("[Quote email] deposit session failed:", err instanceof Error ? err.message : String(err));
    }
  }

  const { subject, html } = buildQuoteCustomerEmail(input, depositUrl, bookingUrl);
  try {
    const resend = new Resend(apiKey);
    const res = await resend.emails.send({
      from: process.env.FROM_EMAIL || "A1 Marine Care <noreply@a1marinecare.ca>",
      to: input.contactEmail,
      replyTo: company.email,
      subject,
      html,
    });
    if (res.error) {
      console.error("[Quote email] send failed:", res.error.message);
      return { sent: false, depositUrl, error: res.error.message };
    }
    console.log("[Quote email] sent", { quoteId: input.quoteId, to: input.contactEmail, deposit: Boolean(depositUrl), resendId: res.data?.id });
    if (depositUrl) void markDepositLinkSent(input.quoteId);
    return { sent: true, depositUrl };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Quote email] send failed:", msg);
    return { sent: false, depositUrl, error: msg };
  }
}
