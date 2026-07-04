import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;

export interface BookingEmailInput {
  bookingId: string;
  quoteId?: string | null;
  serviceSlug: string;
  locationSlug: string;
  date: string;
  timeSlot: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes?: string;
  boatLength?: string;
  recurrenceType?: "weekly" | "biweekly" | null;
  estimatedRecurringRate?: number;
  serviceDisplayName?: string;
  quotedServices?: string[];
  calendarEventId?: string | null;
  calendarHtmlLink?: string | null;
  calendarId?: string;
}

function buildBusinessEmailContent(input: BookingEmailInput): { subject: string; html: string } {
  const serviceDisplay = input.serviceDisplayName || input.serviceSlug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  const recurrenceLabel = input.recurrenceType === "weekly"
    ? "Weekly"
    : input.recurrenceType === "biweekly"
      ? "Bi-Weekly"
      : null;

  const subject = `New Booking Request - ${input.contactName} - ${serviceDisplay}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #111; color: #00CED1; padding: 20px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 20px; }
    .content { background: #f8f8f8; padding: 20px; border-radius: 0 0 8px 8px; }
    .field { margin-bottom: 12px; }
    .label { font-size: 11px; text-transform: uppercase; color: #666; letter-spacing: 0.05em; }
    .value { font-size: 15px; font-weight: 500; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-pending { background: #FEF3C7; color: #92400E; }
    .badge-synced { background: #D1FAE5; color: #065F46; }
    .badge-failed { background: #FEE2E2; color: #991B1B; }
    .section { background: white; border-radius: 6px; padding: 16px; margin-bottom: 12px; border: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>A1 MARINE CARE</h1>
    <p style="margin:4px 0 0;color:#aaa;font-size:12px;">New Booking Request Received</p>
  </div>
  <div class="content">
    <div class="section">
      <div class="field">
        <div class="label">Booking ID</div>
        <div class="value">${input.bookingId}</div>
      </div>
      <div class="field">
        <div class="label">Status</div>
        <span class="badge badge-pending">Pending Confirmation</span>
        ${input.calendarEventId ? `<span class="badge badge-synced" style="margin-left:8px;">Calendar Synced</span>` : ""}
      </div>
    </div>

    <div class="section">
      <div class="field">
        <div class="label">Customer Name</div>
        <div class="value">${input.contactName}</div>
      </div>
      <div class="field">
        <div class="label">Email</div>
        <div class="value"><a href="mailto:${input.contactEmail}">${input.contactEmail}</a></div>
      </div>
      <div class="field">
        <div class="label">Phone</div>
        <div class="value"><a href="tel:${input.contactPhone}">${input.contactPhone}</a></div>
      </div>
    </div>

    <div class="section">
      <div class="field">
        <div class="label">Service</div>
        <div class="value">${serviceDisplay}</div>
      </div>
      <div class="field">
        <div class="label">Location</div>
        <div class="value">${input.locationSlug}</div>
      </div>
      <div class="field">
        <div class="label">Preferred Date</div>
        <div class="value">${input.date}</div>
      </div>
      <div class="field">
        <div class="label">Time Slot</div>
        <div class="value">${input.timeSlot}</div>
      </div>
      ${recurrenceLabel ? `
      <div class="field">
        <div class="label">Recurring Cadence</div>
        <div class="value">${recurrenceLabel}</div>
      </div>
      ` : ""}
      ${input.boatLength ? `
      <div class="field">
        <div class="label">Boat Length</div>
        <div class="value">${input.boatLength}ft</div>
      </div>
      ` : ""}
      ${typeof input.estimatedRecurringRate === "number" ? `
      <div class="field">
        <div class="label">Calculated Recurring Rate</div>
        <div class="value">$${input.estimatedRecurringRate.toFixed(2)} per visit</div>
      </div>
      ` : ""}
      ${input.quoteId ? `
      <div class="field">
        <div class="label">Quote ID</div>
        <div class="value">${input.quoteId}</div>
      </div>
      ` : ""}
    </div>

    ${input.quotedServices && input.quotedServices.length > 0 ? `
    <div class="section">
      <div class="field">
        <div class="label">Quoted Services</div>
        <div class="value">${input.quotedServices.join("<br />")}</div>
      </div>
    </div>
    ` : ""}

    ${input.notes ? `
    <div class="section">
      <div class="field">
        <div class="label">Notes</div>
        <div class="value">${input.notes}</div>
      </div>
    </div>
    ` : ""}

    ${input.calendarEventId ? `
    <div class="section" style="background:#D1FAE5;">
      <div class="field" style="margin:0;">
        <div class="label" style="color:#065F46;">Google Calendar</div>
        <div class="value" style="color:#065F46;font-size:13px;">
          <div>Calendar ID: <strong>${input.calendarId || "primary"}</strong></div>
          <div>Event ID: <strong>${input.calendarEventId}</strong></div>
          ${input.calendarHtmlLink ? `<div style="margin-top:8px;"><a href="${input.calendarHtmlLink}" style="color:#059669;">View in Google Calendar →</a></div>` : ""}
        </div>
      </div>
    </div>
    ` : ""}

    <p style="font-size:12px;color:#666;margin-top:20px;">
      Respond to this booking by contacting the customer directly to confirm scheduling.
    </p>
  </div>
</body>
</html>
  `.trim();

  return { subject, html };
}

export async function sendBookingNotificationEmail(input: BookingEmailInput): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const toEmail = process.env.CONTACT_TO_EMAIL || process.env.BUSINESS_EMAIL || "contact@a1marinecare.ca";
  const fromEmail = process.env.FROM_EMAIL || "A1 Marine Care <noreply@a1marinecare.ca>";

  if (!RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not set - skipping email notification");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const { subject, html } = buildBusinessEmailContent(input);

    console.log(JSON.stringify({
      level: "email_attempt",
      source: "booking",
      to: toEmail,
      from: fromEmail,
      subject,
      bookingId: input.bookingId,
    }));

    const resend = new Resend(RESEND_API_KEY);
    const response = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      replyTo: input.contactEmail,
      subject,
      html,
    });

    if (response.error) {
      console.error(JSON.stringify({
        level: "email_failure",
        source: "booking",
        to: toEmail,
        from: fromEmail,
        subject,
        bookingId: input.bookingId,
        error: response.error,
      }));
      return { success: false, error: response.error.message };
    }

    console.log(JSON.stringify({
      level: "email_success",
      source: "booking",
      to: toEmail,
      from: fromEmail,
      subject,
      bookingId: input.bookingId,
      resendId: response.data?.id,
    }));
    return { success: true, messageId: response.data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({
      level: "email_failure",
      source: "booking",
      to: toEmail,
      from: fromEmail,
      subject: "booking-notification",
      error: msg,
    }));
    return { success: false, error: msg };
  }
}
