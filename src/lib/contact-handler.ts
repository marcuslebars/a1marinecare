// Framework-agnostic handler for the Marine Care contact form (used by the
// /api/contact route; unit-tested directly).
//
// Order matters: the durable server-side record is written FIRST and success is
// only reported after it succeeds — so the customer never sees success while the
// message goes nowhere. The DB lead event, notification email, and CRM forward
// are all best-effort on top of that guaranteed record.

import { randomUUID } from "node:crypto";
import { contactSchema } from "@/lib/validation";
import { appendLeadRecord } from "@/lib/lead-log";
import { createLeadEvent, sendLeadNotificationEmail, isMissingTableError } from "@/lib/lead-events";
import { sendToCrm } from "@/lib/crm-webhook";

const LEAD_TAG = "a1marinecare-contact";
const SOURCE_SITE = "a1marinecare";

export interface ContactHandlerResult {
  status: number;
  body: Record<string, unknown>;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function formatServiceLabel(value: string): string {
  if (!value || value === "general-inquiry") return "General Inquiry";
  return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function contactEmailHtml(
  parsed: { fullName: string; email: string; phone: string; subject: string; serviceInterest: string; message: string },
  id: string,
  receivedAtIso: string,
): string {
  const timestampDisplay = new Intl.DateTimeFormat("en-CA", { dateStyle: "full", timeStyle: "short", timeZone: "America/Toronto" }).format(new Date(receivedAtIso));
  const serviceLabel = formatServiceLabel(parsed.serviceInterest);
  const safeMessageHtml = escapeHtml(parsed.message).replace(/\n/g, "<br />");
  return `
    <div style="margin:0;padding:32px;background:#02070c;font-family:Inter,Arial,sans-serif;color:#e5edf5;">
      <div style="max-width:720px;margin:0 auto;background:#07131d;border:1px solid rgba(255,255,255,0.08);border-radius:24px;overflow:hidden;">
        <div style="padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.08);background:linear-gradient(180deg,#08141f 0%,#06101a 100%);">
          <div style="font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#67f0ff;font-weight:700;">A1 Marine Care · Contact</div>
          <h1 style="margin:14px 0 0;font-size:28px;line-height:1.2;color:#ffffff;">New Contact Form Submission</h1>
          <p style="margin:12px 0 0;font-size:15px;line-height:1.7;color:rgba(229,237,245,0.72);">A new inquiry has been submitted through the A1 Marine Care Contact page.</p>
        </div>
        <div style="padding:32px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:0 0 18px;vertical-align:top;width:50%;">
                <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(229,237,245,0.45);font-weight:700;">Sender Name</div>
                <div style="margin-top:8px;font-size:16px;color:#ffffff;font-weight:600;">${escapeHtml(parsed.fullName)}</div>
              </td>
              <td style="padding:0 0 18px;vertical-align:top;width:50%;">
                <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(229,237,245,0.45);font-weight:700;">Subject</div>
                <div style="margin-top:8px;font-size:16px;color:#ffffff;font-weight:600;">${escapeHtml(parsed.subject)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 18px;vertical-align:top;width:50%;">
                <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(229,237,245,0.45);font-weight:700;">Email</div>
                <div style="margin-top:8px;font-size:16px;color:#ffffff;font-weight:600;">${escapeHtml(parsed.email)}</div>
              </td>
              <td style="padding:0 0 18px;vertical-align:top;width:50%;">
                <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(229,237,245,0.45);font-weight:700;">Phone</div>
                <div style="margin-top:8px;font-size:16px;color:#ffffff;font-weight:600;">${escapeHtml(parsed.phone)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 18px;vertical-align:top;width:50%;">
                <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(229,237,245,0.45);font-weight:700;">Service Interest</div>
                <div style="margin-top:8px;font-size:16px;color:#ffffff;font-weight:600;">${escapeHtml(serviceLabel)}</div>
              </td>
              <td style="padding:0 0 18px;vertical-align:top;width:50%;">
                <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(229,237,245,0.45);font-weight:700;">Submitted</div>
                <div style="margin-top:8px;font-size:16px;color:#ffffff;font-weight:600;">${escapeHtml(timestampDisplay)}</div>
              </td>
            </tr>
          </table>
          <div style="margin-top:10px;padding:22px 24px;border-radius:20px;background:#02070c;border:1px solid rgba(255,255,255,0.06);">
            <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(229,237,245,0.45);font-weight:700;">Message</div>
            <div style="margin-top:12px;font-size:15px;line-height:1.8;color:rgba(229,237,245,0.84);">${safeMessageHtml}</div>
          </div>
          <div style="margin-top:24px;padding:20px;background:#07131d;border-radius:12px;border:1px solid rgba(255,255,255,0.08);">
            <div style="font-size:12px;color:#67f0ff;font-weight:700;margin-bottom:8px;">Lead: ${escapeHtml(id)} · a1marinecare-contact</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function handleContactSubmission(rawBody: unknown): Promise<ContactHandlerResult> {
  let parsed;
  try {
    parsed = contactSchema.parse(rawBody ?? {});
  } catch (err) {
    console.error("[Contact] validation failed:", err instanceof Error ? err.message : String(err));
    return { status: 400, body: { success: false, error: "Invalid request data." } };
  }

  const id = randomUUID();
  const receivedAt = new Date().toISOString();

  // (1) Durable record FIRST — the guarantee. Success is only reported after this.
  try {
    appendLeadRecord({
      id,
      receivedAt,
      source: LEAD_TAG,
      sourceSite: SOURCE_SITE,
      fullName: parsed.fullName,
      email: parsed.email,
      phone: parsed.phone,
      subject: parsed.subject,
      serviceInterest: parsed.serviceInterest,
      message: parsed.message,
      formSource: parsed.source,
    });
  } catch (err) {
    console.error("[Contact] durable log write FAILED:", err instanceof Error ? err.message : String(err));
    return { status: 500, body: { success: false, error: "We couldn't record your message. Please try again." } };
  }

  // (2) Best-effort DB lead event (admin UI) — never blocks success.
  let leadEventId: string | null = null;
  try {
    const leadEvent = await createLeadEvent({
      source: "contact",
      customerName: parsed.fullName,
      email: parsed.email,
      phone: parsed.phone,
      serviceInterest: parsed.serviceInterest,
      message: parsed.message,
      rawPayload: { ...parsed, leadTag: LEAD_TAG },
      leadType: "contact",
    });
    leadEventId = leadEvent.id;
  } catch (err) {
    if (isMissingTableError(err)) console.warn("[Contact] lead_events table unavailable — proceeding on the durable log.");
    else console.error("[Contact] LeadEvent DB save failed:", err instanceof Error ? err.message : String(err));
  }

  // (3) Notification email — distinct subject prefix, best-effort.
  try {
    const emailResult = await sendLeadNotificationEmail(leadEventId ?? "", {
      subject: `[A1 Marine Care · Contact] ${parsed.subject}`,
      html: contactEmailHtml(parsed, id, receivedAt),
      replyTo: parsed.email,
    });
    if (!emailResult.success) {
      console.error(JSON.stringify({ level: "email_failure", source: LEAD_TAG, id, error: emailResult.error }));
    }
  } catch (err) {
    console.error(JSON.stringify({ level: "email_failure", source: LEAD_TAG, id, error: err instanceof Error ? err.message : String(err) }));
  }

  // (4) CRM forward — same pipeline, source-tagged a1marinecare-contact, retrying, fire-and-forget.
  sendToCrm({
    source: "contact",
    sourceSite: SOURCE_SITE,
    leadTag: LEAD_TAG,
    name: parsed.fullName,
    email: parsed.email,
    phone: parsed.phone,
    service: parsed.serviceInterest,
    message: `[${LEAD_TAG}] ${parsed.subject}\n\n${parsed.message}`,
  });

  return { status: 200, body: { success: true, id, submittedAt: receivedAt } };
}
