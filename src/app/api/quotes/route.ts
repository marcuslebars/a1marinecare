import { NextResponse } from "next/server";
import { createLeadEvent, sendLeadNotificationEmail } from "@/lib/lead-events";
import { createQuoteLead } from "@/lib/leads";
import { quoteSchema } from "@/lib/validation";
import { sendToCrm } from "@/lib/crm-webhook";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = quoteSchema.parse(payload);

    console.log("[Quote Create] payload received:", {
      serviceSlug: parsed.services?.length,
    });

    const leadEvent = await createLeadEvent({
      source: "quote",
      customerName: parsed.contactName,
      email: parsed.contactEmail,
      phone: parsed.contactPhone,
      serviceInterest: parsed.services?.join(", "),
      boatLength: parsed.boatLength,
      boatType: parsed.boatType,
      locationSlug: parsed.locationSlug,
      message: parsed.notes,
      rawPayload: payload,
      leadType: "quote",
    });

    console.log("[Quote Create] lead event created:", leadEvent.id);

    const record = await createQuoteLead(parsed);

    console.log("[Quote Create] created ID:", record.id, "| createdAt:", record.createdAt);

    const serviceList = (parsed.services || []).join(", ");
    await sendLeadNotificationEmail(leadEvent.id, {
      subject: `New Quote Request - ${parsed.contactName}`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;padding:32px;background:#02070c;color:#e5edf5;max-width:720px;margin:0 auto;">
          <div style="background:#07131d;border:1px solid rgba(255,255,255,0.08);border-radius:24px;overflow:hidden;">
            <div style="padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.08);background:linear-gradient(180deg,#08141f 0%,#06101a 100%);">
              <div style="font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#67f0ff;font-weight:700;">A1 Marine Care</div>
              <h1 style="margin:14px 0 0;font-size:28px;color:#ffffff;">New Quote Request</h1>
              <p style="margin:12px 0 0;font-size:15px;color:rgba(229,237,245,0.72);">A new quote form was submitted.</p>
            </div>
            <div style="padding:32px;">
              <table style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="padding:0 0 18px;vertical-align:top;width:50%;">
                    <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(229,237,245,0.45);font-weight:700;">Name</div>
                    <div style="margin-top:8px;font-size:16px;color:#ffffff;font-weight:600;">${parsed.contactName}</div>
                  </td>
                  <td style="padding:0 0 18px;vertical-align:top;width:50%;">
                    <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(229,237,245,0.45);font-weight:700;">Email</div>
                    <div style="margin-top:8px;font-size:16px;color:#ffffff;font-weight:600;">${parsed.contactEmail}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 18px;vertical-align:top;">
                    <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(229,237,245,0.45);font-weight:700;">Phone</div>
                    <div style="margin-top:8px;font-size:16px;color:#ffffff;font-weight:600;">${parsed.contactPhone}</div>
                  </td>
                  <td style="padding:0 0 18px;vertical-align:top;">
                    <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(229,237,245,0.45);font-weight:700;">Location</div>
                    <div style="margin-top:8px;font-size:16px;color:#ffffff;font-weight:600;">${parsed.locationSlug}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 18px;vertical-align:top;">
                    <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(229,237,245,0.45);font-weight:700;">Boat</div>
                    <div style="margin-top:8px;font-size:16px;color:#ffffff;font-weight:600;">${parsed.boatLength}ft ${parsed.boatType}</div>
                  </td>
                  <td style="padding:0 0 18px;vertical-align:top;">
                    <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(229,237,245,0.45);font-weight:700;">Services</div>
                    <div style="margin-top:8px;font-size:16px;color:#ffffff;font-weight:600;">${serviceList || "Not specified"}</div>
                  </td>
                </tr>
              </table>
              ${parsed.notes ? `<div style="margin-top:10px;padding:22px 24px;background:#02070c;border:1px solid rgba(255,255,255,0.06);border-radius:20px;"><div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(229,237,245,0.45);font-weight:700;">Notes</div><div style="margin-top:12px;font-size:15px;line-height:1.8;color:rgba(229,237,245,0.84);">${parsed.notes}</div></div>` : ""}
              <div style="margin-top:24px;padding:20px;background:#07131d;border-radius:12px;border:1px solid rgba(255,255,255,0.08);">
                <div style="font-size:12px;color:#67f0ff;font-weight:700;margin-bottom:8px;">Lead ID: ${leadEvent.id}</div>
                <div style="font-size:12px;color:rgba(229,237,245,0.5);">Quote ID: ${record.id}</div>
              </div>
            </div>
          </div>
        </div>
      `,
    });

    // Forward to CRM (fire-and-forget — never blocks the response)
    sendToCrm({
      source: "quote",
      name: parsed.contactName,
      email: parsed.contactEmail,
      phone: parsed.contactPhone,
      service: parsed.services?.join(", "),
      boatLength: parsed.boatLength,
      boatType: parsed.boatType,
      marina: parsed.locationSlug,
      notes: parsed.notes,
    });

    return NextResponse.json({
      success: true,
      id: record.id,
      createdAt: record.createdAt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Quote Create] FAILED:", msg);
    return NextResponse.json({ success: false, error: "Unable to create quote" }, { status: 400 });
  }
}
