import { NextResponse } from "next/server";

import { createLeadEvent, isMissingTableError, sendLeadNotificationEmail } from "@/lib/lead-events";
import { createQuoteLead } from "@/lib/leads";
import { sendToCrm } from "@/lib/crm-webhook";
import { shrinkWrapQuoteSchema } from "@/lib/validation";
import { calculateShrinkWrapQuote, formatCents } from "@/lib/shrink-wrap-pricing";
import { getLocationBySlug } from "@/content/site";

export const runtime = "nodejs";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function row(label: string, value: string) {
  return `<tr><td style="padding:0 0 16px;vertical-align:top;width:50%;"><div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(229,237,245,0.45);font-weight:700;">${label}</div><div style="margin-top:6px;font-size:16px;color:#ffffff;font-weight:600;">${escapeHtml(value)}</div></td>`;
}

/**
 * POST /api/shrink-wrap — the instant-quote form on /shrink-wrapping.
 *
 * Same pipeline as the detailing quote: durable lead_events row → quote lead
 * (so /booking?quoteId= can pick it up) → notification email → CRM webhook +
 * EmpireVu envelope. The price is recomputed here; the client's number is only
 * ever shown back to the customer, never trusted.
 */
export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  let parsed: ReturnType<typeof shrinkWrapQuoteSchema.parse>;

  try {
    payload = await request.json();
    parsed = shrinkWrapQuoteSchema.parse(payload);
  } catch (err) {
    console.error("[ShrinkWrap API] Validation failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ success: false, error: "Invalid request data." }, { status: 400 });
  }

  // Honeypot filled → pretend success, file nothing.
  if (parsed.website) {
    return NextResponse.json({ success: true, quoteId: null, subtotalCents: 0 });
  }

  const quote = calculateShrinkWrapQuote({
    lengthFt: parsed.lengthFt,
    hullType: parsed.hullType,
    winterization: parsed.winterization ?? null,
  });

  const location = getLocationBySlug(parsed.locationSlug);
  const locationLabel = location ? `${location.name}, ${location.region}` : parsed.locationSlug;
  const services = ["Shrink Wrapping"];
  if (parsed.winterization) services.push("Winterization");
  const winterizationLabel = parsed.winterization
    ? `${parsed.winterization.engineType} × ${parsed.winterization.engineCount}`
    : "No";

  // Strip the honeypot + client-only fields from what we persist.
  const { website: _website, eventId, ...rawPayload } = parsed;
  void _website;

  let leadEventId: string | null = null;
  try {
    const leadEvent = await createLeadEvent({
      source: "quote",
      customerName: parsed.contactName,
      email: parsed.contactEmail,
      phone: parsed.contactPhone,
      serviceInterest: services.join(", "),
      boatLength: String(parsed.lengthFt),
      boatType: parsed.hullType,
      locationSlug: parsed.locationSlug,
      message: parsed.notes,
      rawPayload: { ...rawPayload, quotedSubtotalCents: quote.subtotalCents, lineItems: quote.lineItems },
      leadType: "shrink-wrap",
      metadata: {
        formType: "shrink-wrap-quote",
        utm: parsed.utm ?? {},
        metaEventId: eventId ?? null,
        requiresManualReview: quote.requiresManualReview,
        reviewReasons: quote.reviewReasons,
      },
    });
    leadEventId = leadEvent.id;
    console.log("[ShrinkWrap API] Lead event saved:", leadEventId);
  } catch (err) {
    if (isMissingTableError(err)) {
      console.warn("[ShrinkWrap API] lead_events table unavailable. Proceeding without lead tracking.");
    } else {
      console.error("[ShrinkWrap API] LeadEvent DB save failed:", err instanceof Error ? err.message : String(err));
    }
  }

  // Quote lead record so the booking flow can prefill from ?quoteId=.
  let quoteId: string | null = null;
  try {
    const record = await createQuoteLead({
      boatLength: String(parsed.lengthFt),
      boatType: parsed.hullType,
      services,
      addons: parsed.winterization ? [`winterization:${parsed.winterization.engineType}:${parsed.winterization.engineCount}`] : [],
      contactName: parsed.contactName,
      contactEmail: parsed.contactEmail,
      contactPhone: parsed.contactPhone,
      notes: [parsed.boatLocation ? `Boat location: ${parsed.boatLocation}` : "", parsed.preferredWindow ? `Preferred window: ${parsed.preferredWindow}` : "", parsed.notes]
        .filter(Boolean)
        .join("\n"),
      locationSlug: parsed.locationSlug,
      estimatedTotal: quote.subtotalCents,
      requiresManualReview: quote.requiresManualReview,
      reviewReasons: quote.reviewReasons,
      metadata: { formType: "shrink-wrap-quote", lineItems: quote.lineItems, utm: parsed.utm ?? {} },
    });
    quoteId = record.id;
  } catch (err) {
    console.error("[ShrinkWrap API] Quote lead save failed:", err instanceof Error ? err.message : String(err));
  }

  const lineItemsHtml = quote.lineItems
    .map(
      (item) =>
        `<tr><td style="padding:8px 0;color:rgba(229,237,245,0.84);">${escapeHtml(item.label)}<div style="font-size:12px;color:rgba(229,237,245,0.5);">${escapeHtml(item.description)}</div></td><td style="padding:8px 0;text-align:right;color:#ffffff;font-weight:600;white-space:nowrap;">${formatCents(item.amountCents)}</td></tr>`,
    )
    .join("");

  const emailResult = await sendLeadNotificationEmail(leadEventId ?? "", {
    subject: `Shrink Wrap Lead — ${parsed.contactName} · ${parsed.lengthFt} ft ${parsed.hullType} · ${formatCents(quote.subtotalCents)}`,
    html: `
      <div style="margin:0;padding:32px;background:#02070c;font-family:Inter,Arial,sans-serif;color:#e5edf5;">
        <div style="max-width:720px;margin:0 auto;background:#07131d;border:1px solid rgba(255,255,255,0.08);border-radius:24px;overflow:hidden;">
          <div style="padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.08);background:linear-gradient(180deg,#08141f 0%,#06101a 100%);">
            <div style="font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#67f0ff;font-weight:700;">A1 Marine Care · Shrink Wrap</div>
            <h1 style="margin:14px 0 0;font-size:28px;line-height:1.2;color:#ffffff;">New mobile shrink wrap quote</h1>
            <p style="margin:12px 0 0;font-size:15px;color:rgba(229,237,245,0.72);">Call within the hour — ad leads go cold fast.</p>
          </div>
          <div style="padding:32px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>${row("Name", parsed.contactName)}${row("Phone", parsed.contactPhone)}</tr>
              <tr>${row("Email", parsed.contactEmail)}${row("Area", locationLabel)}</tr>
              <tr>${row("Boat", `${parsed.lengthFt} ft ${parsed.hullType}`)}${row("Winterization", winterizationLabel)}</tr>
              <tr>${row("Where the boat is", parsed.boatLocation || "Not given")}${row("Preferred window", parsed.preferredWindow || "Flexible")}</tr>
            </table>
            <div style="margin-top:8px;padding:20px 24px;border-radius:20px;background:#02070c;border:1px solid rgba(255,255,255,0.06);">
              <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(229,237,245,0.45);font-weight:700;">Quoted (before HST)</div>
              <table style="width:100%;border-collapse:collapse;margin-top:8px;">${lineItemsHtml}
                <tr><td style="padding:12px 0 0;border-top:1px solid rgba(255,255,255,0.1);font-weight:700;color:#ffffff;">Total</td><td style="padding:12px 0 0;border-top:1px solid rgba(255,255,255,0.1);text-align:right;font-weight:700;color:#67f0ff;font-size:18px;">${formatCents(quote.subtotalCents)}</td></tr>
              </table>
              ${quote.requiresManualReview ? `<p style="margin:12px 0 0;color:#fbbf24;font-size:13px;">Needs manual review: ${escapeHtml(quote.reviewReasons.join("; "))}</p>` : ""}
            </div>
            ${parsed.notes ? `<div style="margin-top:16px;padding:20px 24px;border-radius:20px;background:#02070c;border:1px solid rgba(255,255,255,0.06);"><div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(229,237,245,0.45);font-weight:700;">Notes</div><div style="margin-top:10px;font-size:15px;line-height:1.7;">${escapeHtml(parsed.notes).replace(/\n/g, "<br />")}</div></div>` : ""}
            <div style="margin-top:20px;font-size:12px;color:rgba(229,237,245,0.5);">
              Lead ID: ${leadEventId ?? "n/a"} · Quote ID: ${quoteId ?? "n/a"}${parsed.utm && Object.keys(parsed.utm).length ? ` · ${escapeHtml(Object.entries(parsed.utm).map(([k, v]) => `${k}=${v}`).join(" "))}` : ""}
            </div>
          </div>
        </div>
      </div>
    `,
    replyTo: parsed.contactEmail,
  });

  if (!emailResult.success) {
    console.error(JSON.stringify({ level: "email_failure", source: "shrink-wrap", leadEventId, error: emailResult.error }));
  }

  sendToCrm({
    source: "quote",
    leadTag: "a1marinecare-shrink-wrap",
    name: parsed.contactName,
    email: parsed.contactEmail,
    phone: parsed.contactPhone,
    service: services.join(", "),
    boatLength: String(parsed.lengthFt),
    boatType: parsed.hullType,
    marina: parsed.boatLocation || locationLabel,
    notes: [
      `Quoted ${formatCents(quote.subtotalCents)} (${quote.lineItems.map((i) => `${i.label} ${formatCents(i.amountCents)}`).join(", ")})`,
      parsed.preferredWindow ? `Preferred window: ${parsed.preferredWindow}` : "",
      parsed.notes,
    ]
      .filter(Boolean)
      .join("\n"),
    utm: parsed.utm,
  });

  return NextResponse.json({
    success: true,
    quoteId,
    subtotalCents: quote.subtotalCents,
    lineItems: quote.lineItems,
    requiresManualReview: quote.requiresManualReview,
  });
}
