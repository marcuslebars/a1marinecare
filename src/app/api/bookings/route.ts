import { NextResponse } from "next/server";
import { createLeadEvent, isMissingTableError } from "@/lib/lead-events";
import { createBookingLead } from "@/lib/leads";
import { bookingSchema } from "@/lib/validation";
import { sendToCrm } from "@/lib/crm-webhook";
import { loadSlotCounts } from "@/lib/retell/bookings";
import { CAPACITY_PER_WINDOW, SHRINK_WRAP_SERVICE_SLUG, WINDOWS, WORKING_DAYS, earliestBookableDate, isWindowOpen, weekdayOf, type Window } from "@/lib/retell/slots";

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

  // Shrink wrap shares Marina's capacity rule: 2 per half-day, Mon–Sat, 24 h notice.
  if (parsed.serviceSlug === SHRINK_WRAP_SERVICE_SLUG) {
    const window: Window | null = WINDOWS.morning.slots.includes(parsed.timeSlot) ? "morning" : WINDOWS.afternoon.slots.includes(parsed.timeSlot) ? "afternoon" : null;
    const earliest = earliestBookableDate(new Date());
    if (!window || !WORKING_DAYS.has(weekdayOf(parsed.date)) || parsed.date < earliest) {
      return NextResponse.json({ success: false, error: "Shrink wrap bookings need at least a day's notice, Monday to Saturday. Please pick another day." }, { status: 409 });
    }
    const counts = await loadSlotCounts(parsed.date, parsed.date).catch(() => []);
    if (!isWindowOpen(counts, parsed.date, window, CAPACITY_PER_WINDOW)) {
      return NextResponse.json({ success: false, error: `That ${window} is full. Please pick another ${window === "morning" ? "morning or an afternoon" : "afternoon or a morning"}.` }, { status: 409 });
    }
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
