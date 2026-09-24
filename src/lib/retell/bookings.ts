import { prisma } from "@/lib/db/prisma";
import { createBookingLead, getQuoteLead } from "@/lib/leads";
import { createLeadEvent, isMissingTableError } from "@/lib/lead-events";
import { sendToCrm } from "@/lib/crm-webhook";
import { formatCents } from "@/lib/shrink-wrap-pricing";

import {
  CAPACITY_PER_WINDOW,
  SHRINK_WRAP_SERVICE_SLUG,
  WINDOWS,
  addDays,
  earliestBookableDate,
  findAvailableSlots,
  isWindowOpen,
  spokenLabel,
  type AvailableSlot,
  type SlotCount,
  type Window,
} from "./slots";

const CANCELLED = new Set(["cancelled", "canceled", "declined"]);

/** Booked shrink-wrap slots between two dates (inclusive), grouped by date + slot. Empty without a DB. */
export async function loadSlotCounts(fromDate: string, toDate: string): Promise<SlotCount[]> {
  if (!process.env.DATABASE_URL) return [];
  const rows = await prisma.bookingRequest.findMany({
    where: { serviceSlug: SHRINK_WRAP_SERVICE_SLUG, date: { gte: fromDate, lte: toDate } },
    select: { date: true, timeSlot: true, status: true },
  });
  const map = new Map<string, SlotCount>();
  for (const r of rows) {
    if (CANCELLED.has((r.status || "").toLowerCase())) continue;
    const key = `${r.date}|${r.timeSlot}`;
    const cur = map.get(key) ?? { date: r.date, timeSlot: r.timeSlot, count: 0 };
    cur.count += 1;
    map.set(key, cur);
  }
  return [...map.values()];
}

export async function availableShrinkWrapSlots(input: { preferredDate?: string | null; preferredWindow?: Window | null; limit?: number; now?: Date }): Promise<AvailableSlot[]> {
  const now = input.now ?? new Date();
  const from = earliestBookableDate(now);
  const counts = await loadSlotCounts(from, addDays(from, 30));
  return findAvailableSlots({ now, counts, preferredDate: input.preferredDate, preferredWindow: input.preferredWindow, limit: input.limit ?? 3 });
}

export type PhoneBookingResult =
  | { ok: true; bookingId: string; date: string; window: Window; spokenLabel: string; confirmationLine: string; duplicate: boolean; calendarEventId: string | null }
  | { ok: false; reason: "quote_not_found" | "slot_taken" | "not_bookable"; say: string; alternatives?: AvailableSlot[] };

/**
 * Book a half-day shrink wrap window against an existing quote. Idempotent per
 * Retell call: a second call for the same call_id + quote returns the first
 * booking instead of creating another.
 */
export async function bookShrinkWrapWindow(input: {
  quoteId: string;
  date: string;
  window: Window;
  retellCallId: string | null;
  fromNumber: string | null;
  now?: Date;
}): Promise<PhoneBookingResult> {
  const now = input.now ?? new Date();
  const quote = await getQuoteLead(input.quoteId).catch(() => null);
  if (!quote || quote.metadata?.formType !== "shrink-wrap-quote") {
    return { ok: false, reason: "quote_not_found", say: "I couldn't find that quote on my end. Let me redo it quickly." };
  }

  // Idempotency: same call, same quote → same booking.
  if (process.env.DATABASE_URL && input.retellCallId) {
    const existing = await prisma.bookingRequest
      .findFirst({
        where: { quoteId: input.quoteId, metadata: { path: ["retellCallId"], equals: input.retellCallId } },
        select: { id: true, date: true, timeSlot: true, googleCalendarEventId: true },
      })
      .catch(() => null);
    if (existing) {
      const window: Window = WINDOWS.afternoon.slots.includes(existing.timeSlot) ? "afternoon" : "morning";
      const label = spokenLabel(existing.date, window);
      return { ok: true, bookingId: existing.id, date: existing.date, window, spokenLabel: label, confirmationLine: `You're already booked for ${label}.`, duplicate: true, calendarEventId: existing.googleCalendarEventId };
    }
  }

  const earliest = earliestBookableDate(now);
  if (input.date < earliest) {
    const alternatives = await availableShrinkWrapSlots({ preferredWindow: input.window, now });
    return { ok: false, reason: "not_bookable", say: "That's too soon for the crew to route. The next openings are:", alternatives };
  }

  const counts = await loadSlotCounts(input.date, input.date);
  if (!isWindowOpen(counts, input.date, input.window, CAPACITY_PER_WINDOW)) {
    const alternatives = await availableShrinkWrapSlots({ preferredDate: input.date, preferredWindow: input.window, now });
    return { ok: false, reason: "slot_taken", say: "That window just filled up. Closest openings are:", alternatives };
  }

  const label = spokenLabel(input.date, input.window);
  const timeSlot = WINDOWS[input.window].slot;
  const quotedTotal = typeof quote.estimatedTotal === "number" ? formatCents(quote.estimatedTotal) : null;
  const notes = [
    "Booked by Marina (phone).",
    quotedTotal ? `Quoted ${quotedTotal} + HST.` : "",
    input.retellCallId ? `Retell call ${input.retellCallId}.` : "",
    quote.notes ?? "",
  ]
    .filter(Boolean)
    .join("\n");

  const record = await createBookingLead({
    quoteId: input.quoteId,
    serviceSlug: SHRINK_WRAP_SERVICE_SLUG,
    serviceDisplayName: "Mobile shrink wrap",
    quotedServices: quote.services,
    locationSlug: quote.locationSlug,
    date: input.date,
    timeSlot,
    contactName: quote.contactName,
    contactEmail: quote.contactEmail,
    contactPhone: quote.contactPhone,
    notes,
    boatLength: quote.boatLength,
    metadata: { channel: "marina", retellCallId: input.retellCallId, window: input.window, fromNumber: input.fromNumber },
  });

  try {
    await createLeadEvent({
      source: "booking",
      customerName: quote.contactName,
      email: quote.contactEmail,
      phone: quote.contactPhone,
      serviceInterest: SHRINK_WRAP_SERVICE_SLUG,
      boatLength: quote.boatLength,
      boatType: quote.boatType,
      locationSlug: quote.locationSlug,
      message: notes,
      rawPayload: { bookingId: record.id, date: input.date, window: input.window, retellCallId: input.retellCallId },
      leadId: input.quoteId,
      leadType: "booking",
      metadata: { channel: "marina", retellCallId: input.retellCallId },
    });
  } catch (err) {
    if (!isMissingTableError(err)) console.error("[Marina booking] lead event failed:", err instanceof Error ? err.message : String(err));
  }

  sendToCrm({
    source: "booking",
    leadTag: "a1marinecare-shrink-wrap-booking",
    name: quote.contactName,
    email: quote.contactEmail,
    phone: quote.contactPhone,
    service: SHRINK_WRAP_SERVICE_SLUG,
    boatLength: quote.boatLength,
    marina: quote.locationSlug,
    date: input.date,
    timeSlot,
    notes,
  });

  return {
    ok: true,
    bookingId: record.id,
    date: input.date,
    window: input.window,
    spokenLabel: label,
    confirmationLine: `You're booked for ${label}. Marcus will text to confirm the arrival time the day before.`,
    duplicate: false,
    calendarEventId: record.googleCalendarEventId,
  };
}
