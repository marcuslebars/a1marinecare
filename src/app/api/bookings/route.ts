import { NextResponse } from "next/server";
import { createLeadEvent, isMissingTableError } from "@/lib/lead-events";
import { createBookingLead } from "@/lib/leads";
import { bookingSchema } from "@/lib/validation";
import { sendToCrm } from "@/lib/crm-webhook";

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  let parsed: {
    quoteId?: string | null;
    serviceSlug: string;
    serviceDisplayName?: string;
    quotedServices?: string[];
    locationSlug: string;
    date: string;
    timeSlot: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    notes: string;
    boatLength?: string;
    recurrenceType?: "weekly" | "biweekly" | null;
    bookingMode?: "one-time" | "recurring";
    estimatedRecurringRate?: number;
    metadata?: Record<string, unknown>;
  };

  try {
    payload = await request.json();
    parsed = bookingSchema.parse(payload);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Booking Create] Validation failed:", msg);
    return NextResponse.json({ success: false, error: "Invalid request data." }, { status: 400 });
  }

  let leadEventId: string | null = null;
  try {
    const leadEvent = await createLeadEvent({
      source: "booking",
      customerName: parsed.contactName,
      email: parsed.contactEmail,
      phone: parsed.contactPhone,
      serviceInterest: parsed.serviceSlug,
      locationSlug: parsed.locationSlug,
      message: parsed.notes,
      rawPayload: payload,
      leadId: parsed.quoteId ?? undefined,
      leadType: "booking",
    });
    leadEventId = leadEvent.id;
    console.log("[Booking Create] Lead saved:", leadEventId);
  } catch (err) {
    if (isMissingTableError(err)) {
      console.warn("[Booking Create] lead_events table unavailable. Proceeding without lead tracking.");
    } else {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Booking Create] LeadEvent DB save failed:", msg);
    }
  }

  let record: { id: string; createdAt: string; googleCalendarEventId: string | null; googleCalendarHtmlLink: string | null };
  try {
    record = await createBookingLead(parsed);
    console.log("[Booking Create] Booking created:", record.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Booking Create] Booking creation failed:", msg);
    return NextResponse.json({ success: false, error: "Unable to create booking" }, { status: 500 });
  }

  // Forward to CRM (fire-and-forget — never blocks the response)
  sendToCrm({
    source: "booking",
    name: parsed.contactName,
    email: parsed.contactEmail,
    phone: parsed.contactPhone,
    service: parsed.serviceSlug,
    boatLength: parsed.boatLength,
    marina: parsed.locationSlug,
    date: parsed.date,
    timeSlot: parsed.timeSlot,
    notes: parsed.notes,
  });

  return NextResponse.json({
    success: true,
    id: record.id,
    createdAt: record.createdAt,
    googleCalendarEventId: record.googleCalendarEventId,
  });
}
