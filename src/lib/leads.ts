import { MockLeadRepository } from "@/lib/db/mock-repository";
import { PrismaLeadRepository } from "@/lib/db/prisma-repository";
import type { LeadRepository } from "@/lib/db/types";
import type { QuoteFormData } from "@/types/lead";
import { createGoogleCalendarEvent, estimateEventDuration, buildEventTimes, type CalendarEventResult } from "@/lib/google-calendar";
import { sendBookingNotificationEmail } from "@/lib/emails";
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

  console.log("[Booking] Creating booking...", {
    serviceSlug: payload.serviceSlug,
    locationSlug: payload.locationSlug,
    quoteId: payload.quoteId,
  });

  const record = await repository.createBookingLead(payload);

  console.log("[Booking] Booking created:", record.id);

  let calendarEventId: string | null = null;
  let calendarHtmlLink: string | null = null;
  let calendarSyncStatus: string = "pending";
  let emailStatus: string = "pending";
  const calendarIdUsed = process.env.GOOGLE_CALENDAR_ID || "primary";

  // Step 1: Google Calendar
  if (process.env.GOOGLE_REFRESH_TOKEN && process.env.GOOGLE_CLIENT_ID) {
    console.log("[Google Calendar] Creating event...", {
      bookingId: record.id,
      calendarId: calendarIdUsed,
    });

    try {
      const durationHours = estimateEventDuration(payload.serviceSlug);
      const { startDateTime, endDateTime } = buildEventTimes(payload.date, payload.timeSlot, durationHours);

      console.log("[Google Calendar] Event payload:", {
        summary: `A1 Marine Care - ${payload.contactName}`,
        start: startDateTime,
        end: endDateTime,
        durationHours,
      });

      const calendarResult: CalendarEventResult = await createGoogleCalendarEvent({
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

      calendarEventId = calendarResult.eventId;
      calendarHtmlLink = calendarResult.htmlLink;

      if (calendarEventId) {
        calendarSyncStatus = "synced";
        console.log("[Google Calendar] Event created successfully:", calendarEventId);
        console.log("[Google Calendar] htmlLink:", calendarHtmlLink);
      } else {
        calendarSyncStatus = "failed";
        console.error("[Google Calendar] Event returned null - calendar API may have failed silently");
      }
    } catch (err) {
      calendarSyncStatus = "failed";
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Google Calendar] Event creation failed:", msg);
    }
  } else {
    console.warn("[Google Calendar] Skipped - GOOGLE_REFRESH_TOKEN or GOOGLE_CLIENT_ID not set");
    calendarSyncStatus = "not_configured";
  }

  // Step 2: Email notification
  if (process.env.RESEND_API_KEY) {
    console.log("[Email] Sending booking notification...", {
      bookingId: record.id,
      to: process.env.BUSINESS_EMAIL || "contact@a1marinecare.ca",
    });

    try {
      const emailResult = await sendBookingNotificationEmail({
        bookingId: record.id,
        quoteId: payload.quoteId ?? null,
        serviceSlug: payload.serviceSlug,
        locationSlug: payload.locationSlug,
        date: payload.date,
        timeSlot: payload.timeSlot,
        contactName: payload.contactName,
        contactEmail: payload.contactEmail,
        contactPhone: payload.contactPhone,
        notes: payload.notes,
        calendarEventId,
        calendarHtmlLink,
        calendarId: calendarIdUsed,
      });

      if (emailResult.success) {
        emailStatus = "sent";
        console.log(`[Email] Booking notification sent. Message ID: ${emailResult.messageId}`);
      } else {
        emailStatus = `failed: ${emailResult.error}`;
        console.error("[Email] Booking notification failed:", emailResult.error);
      }
    } catch (err) {
      emailStatus = "failed";
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Email] Booking notification threw:", msg);
    }
  } else {
    console.warn("[Email] Skipped - RESEND_API_KEY not set");
    emailStatus = "not_configured";
  }

  // Step 3: Update booking record with sync statuses
  if (process.env.DATABASE_URL) {
    try {
      await prisma.bookingRequest.update({
        where: { id: record.id },
        data: {
          googleCalendarEventId: calendarEventId,
          googleCalendarHtmlLink: calendarHtmlLink,
          calendarSyncStatus,
          emailStatus,
        },
      });
      console.log("[Booking] Record updated with sync statuses", {
        calendarSyncStatus,
        emailStatus,
      });
    } catch (err) {
      console.error("[Booking] Failed to update sync statuses on record:", err);
    }
  }

  console.log("[Booking] Booking flow complete.", {
    bookingId: record.id,
    calendarEventId,
    calendarHtmlLink,
    calendarSyncStatus,
    emailStatus,
  });

  return {
    id: record.id,
    createdAt: record.createdAt,
    googleCalendarEventId: calendarEventId,
    googleCalendarHtmlLink: calendarHtmlLink,
  };
}
