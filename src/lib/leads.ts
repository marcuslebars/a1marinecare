import { MockLeadRepository } from "@/lib/db/mock-repository";
import { PrismaLeadRepository } from "@/lib/db/prisma-repository";
import type { LeadRepository } from "@/lib/db/types";
import type { QuoteFormData } from "@/types/lead";
import { createGoogleCalendarEvent, estimateEventDuration, buildEventTimes } from "@/lib/google-calendar";
import { prisma } from "@/lib/db/prisma";

function getLeadRepository(): LeadRepository {
  if (process.env.DATABASE_URL) {
    return new PrismaLeadRepository();
  }
  return new MockLeadRepository();
}

export async function createQuoteLead(payload: Parameters<LeadRepository["createQuoteLead"]>[0]) {
  const repository = getLeadRepository();
  try {
    return await repository.createQuoteLead(payload);
  } catch (err) {
    if (process.env.DATABASE_URL) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("does not exist") || msg.includes("relation") || msg.includes("table")) {
        throw new Error("Database tables not found. Please run: npx prisma migrate deploy");
      }
    }
    throw err;
  }
}

export async function getQuoteLead(id: string): Promise<QuoteFormData | null> {
  const repository = getLeadRepository();
  return repository.getQuoteLead(id);
}

export async function createBookingLead(payload: Parameters<LeadRepository["createBookingLead"]>[0]) {
  const repository = getLeadRepository();
  const record = await repository.createBookingLead(payload);

  let calendarEventId: string | null = null;

  if (process.env.GOOGLE_REFRESH_TOKEN && process.env.GOOGLE_CLIENT_ID) {
    try {
      const durationHours = estimateEventDuration(payload.serviceSlug);
      const { startDateTime, endDateTime } = buildEventTimes(payload.date, payload.timeSlot, durationHours);

      calendarEventId = await createGoogleCalendarEvent({
        summary: `A1 Marine Care - ${payload.contactName}`,
        description: `Booking #${record.id}`,
        startDateTime,
        endDateTime,
        timeZone: "America/Toronto",
        bookingId: record.id,
        quoteId: payload.quoteId ?? null,
        customerName: payload.contactName,
        customerEmail: payload.contactEmail,
        customerPhone: payload.contactPhone,
        serviceSlug: payload.serviceSlug,
        locationSlug: payload.locationSlug,
        notes: payload.notes,
      });

      if (calendarEventId && process.env.DATABASE_URL) {
        await prisma.bookingRequest.update({
          where: { id: record.id },
          data: { googleCalendarEventId: calendarEventId },
        });
        console.log("[Booking] Calendar event linked:", calendarEventId);
      }
    } catch (err) {
      console.error("[Booking] Google Calendar event creation failed:", err);
    }
  }

  return {
    id: record.id,
    createdAt: record.createdAt,
    googleCalendarEventId: calendarEventId,
  };
}
