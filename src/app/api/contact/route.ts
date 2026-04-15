import { NextResponse } from "next/server";
import { Resend } from "resend";

import { contactSchema } from "@/lib/validation";

export const runtime = "nodejs";

function formatServiceLabel(value: string) {
  if (!value || value === "general-inquiry") return "General Inquiry";

  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = contactSchema.parse(payload);

    const apiKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.CONTACT_TO_EMAIL;
    const fromEmail = process.env.CONTACT_FROM_EMAIL || "A1 Marine Care <onboarding@resend.dev>";

    if (!apiKey || !toEmail) {
      console.error("[Contact API] Missing Resend environment variables");
      return NextResponse.json(
        {
          success: false,
          error: "Contact form email is not configured yet.",
        },
        { status: 500 },
      );
    }

    const resend = new Resend(apiKey);
    const timestampIso = new Date().toISOString();
    const timestampDisplay = new Intl.DateTimeFormat("en-CA", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "America/Toronto",
    }).format(new Date(timestampIso));

    const serviceLabel = formatServiceLabel(parsed.serviceInterest);
    const safeMessageHtml = escapeHtml(parsed.message).replace(/\n/g, "<br />");

    const emailSubject = `New Contact Inquiry: ${parsed.subject}`;

    await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      replyTo: parsed.email,
      subject: emailSubject,
      text: [
        `A new contact form submission was received from A1 Marine Care.`,
        ``,
        `Name: ${parsed.fullName}`,
        `Email: ${parsed.email}`,
        `Phone: ${parsed.phone}`,
        `Subject: ${parsed.subject}`,
        `Service Interest: ${serviceLabel}`,
        `Source: ${parsed.source || "contact-page"}`,
        `Timestamp: ${timestampIso}`,
        ``,
        `Message:`,
        parsed.message,
      ].join("\n"),
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
                <tr>
                  <td colspan="2" style="padding:0 0 18px;vertical-align:top;">
                    <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(229,237,245,0.45);font-weight:700;">Source</div>
                    <div style="margin-top:8px;font-size:16px;color:#ffffff;font-weight:600;">${escapeHtml(parsed.source || "contact-page")}</div>
                  </td>
                </tr>
              </table>

              <div style="margin-top:10px;padding:22px 24px;border-radius:20px;background:#02070c;border:1px solid rgba(255,255,255,0.06);">
                <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(229,237,245,0.45);font-weight:700;">Message</div>
                <div style="margin-top:12px;font-size:15px;line-height:1.8;color:rgba(229,237,245,0.84);">${safeMessageHtml}</div>
              </div>
            </div>
          </div>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      submittedAt: timestampIso,
    });
  } catch (error) {
    console.error("[Contact API] Failed to send contact submission", error);

    return NextResponse.json(
      {
        success: false,
        error: "We could not send your message right now. Please try again in a moment.",
      },
      { status: 400 },
    );
  }
}
