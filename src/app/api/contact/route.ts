import { NextResponse } from "next/server";
import { after } from "next/server";
import { createLeadEvent, sendLeadNotificationEmail, isMissingTableError } from "@/lib/lead-events";
import { contactSchema } from "@/lib/validation";
import { sendToCrm } from "@/lib/crm-webhook";
import { queueOutboundCall } from "@/lib/retell/outbound";

export const runtime = "nodejs";

function formatServiceLabel(value: string) {
  if (!value || value === "general-inquiry") return "General Inquiry";
  return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  let parsed: { fullName: string; email: string; phone: string; serviceInterest: string; message: string; subject: string };

  try {
    payload = await request.json();
    parsed = contactSchema.parse(payload);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Contact API] Validation failed:", msg);
    return NextResponse.json({ success: false, error: "Invalid request data." }, { status: 400 });
  }

  let leadEventId: string | null = null;
  try {
    const leadEvent = await createLeadEvent({
      source: "contact",
      customerName: parsed.fullName,
      email: parsed.email,
      phone: parsed.phone,
      serviceInterest: parsed.serviceInterest,
      message: parsed.message,
      rawPayload: payload,
      leadType: "contact",
    });
    leadEventId = leadEvent.id;
    console.log("[Contact API] Lead saved:", leadEventId);
    // Speed to lead: Marina calls back in a couple of minutes, knowing what they wrote.
    const detail = `${formatServiceLabel(parsed.serviceInterest)}${parsed.message ? ` — "${parsed.message.slice(0, 200)}"` : ""}`;
    after(async () => {
      await queueOutboundCall({ to: parsed.phone, name: parsed.fullName, reason: "contact", detail });
    });
  } catch (err) {
    if (isMissingTableError(err)) {
      console.warn("[Contact API] lead_events table unavailable. Proceeding without lead tracking.");
    } else {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Contact API] LeadEvent DB save failed:", msg);
    }
  }

  const timestampIso = new Date().toISOString();
  const timestampDisplay = new Intl.DateTimeFormat("en-CA", { dateStyle: "full", timeStyle: "short", timeZone: "America/Toronto" }).format(new Date(timestampIso));
  const serviceLabel = formatServiceLabel(parsed.serviceInterest);
  const safeMessageHtml = escapeHtml(parsed.message).replace(/\n/g, "<br />");

  const emailResult = await sendLeadNotificationEmail(leadEventId ?? "", {
    subject: `New Contact Inquiry: ${parsed.subject}`,
    html: `
      <div style="margin:0;padding:32px;background:#02070c;font-family:Inter,Arial,sans-serif;color:#e5edf5;">
        <div style="max-width:720px;margin:0 auto;background:#07131d;border:1px solid rgba(255,255,255,0.08);border-radius:24px;overflow:hidden;">
          <div style="padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.08);background:linear-gradient(180deg,#08141f 0%,#06101a 100%);">
            <div style="font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#67f0ff;font-weight:700;">A1 Marine Care</div>
            <h1 style="margin:14px 0 0;font-size:28px;line-height:1.2;color:#ffffff;">New Contact Form Submission</h1>
            <p style="margin:12px 0 0;font-size:15px;line-height:1.7;color:rgba(229,237,245,0.72);">A new inquiry has been submitted through the Contact Us page.</p>
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
              <div style="font-size:12px;color:#67f0ff;font-weight:700;margin-bottom:8px;">Lead ID: ${leadEventId}</div>
            </div>
          </div>
        </div>
      </div>
    `,
    replyTo: parsed.email,
  });

  if (!emailResult.success) {
    console.error(JSON.stringify({ level: "email_failure", source: "contact", leadEventId, error: emailResult.error }));
  } else {
    console.log(JSON.stringify({ level: "email_success", source: "contact", leadEventId, resendId: emailResult.messageId }));
  }

  // Forward to CRM (fire-and-forget — never blocks the response)
  sendToCrm({
    source: "contact",
    name: parsed.fullName,
    email: parsed.email,
    phone: parsed.phone,
    service: parsed.serviceInterest,
    message: parsed.message,
  });

  return NextResponse.json({ success: true, submittedAt: timestampIso });
}
