import { google } from "googleapis";

export interface CalendarEventInput {
  summary: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  timeZone: string;
  location?: string;
  attendeeEmail?: string;
  bookingId: string;
  quoteId?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceSlug: string;
  locationSlug: string;
  notes?: string;
  recurrence?: string[];
}

async function getOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "https://a1marinecare.ca/api/google/oauth/callback",
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return oauth2Client;
}

export interface CalendarEventResult {
  eventId: string | null;
  htmlLink: string | null;
}

export async function createGoogleCalendarEvent(input: CalendarEventInput): Promise<CalendarEventResult> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

  console.log("[Google Calendar] ========== EVENT CREATION START ==========");
  console.log("[Google Calendar] Calendar ID:", calendarId);
  console.log("[Google Calendar] Event title:", input.summary);
  console.log("[Google Calendar] start.dateTime:", input.startDateTime);
  console.log("[Google Calendar] end.dateTime:", input.endDateTime);
  console.log("[Google Calendar] timeZone:", input.timeZone);
  console.log("[Google Calendar] location:", input.location || "(none)");
  console.log("[Google Calendar] attendeeEmail:", input.attendeeEmail || "(none)");
  console.log("[Google Calendar] bookingId:", input.bookingId);
  console.log("[Google Calendar] =========================================");

  try {
    const auth = await getOAuth2Client();
    const calendar = google.calendar({ version: "v3", auth });

    const event = {
      summary: input.summary,
      description: [
        `Booking ID: ${input.bookingId}`,
        input.quoteId ? `Quote ID: ${input.quoteId}` : null,
        `Customer: ${input.customerName}`,
        `Email: ${input.customerEmail}`,
        `Phone: ${input.customerPhone}`,
        `Service: ${input.serviceSlug}`,
        `Location: ${input.locationSlug}`,
        input.notes ? `Notes: ${input.notes}` : null,
        "",
        "Created by A1 Marine Care Booking System",
      ]
        .filter(Boolean)
        .join("\n"),
      location: input.location || "",
      start: {
        dateTime: input.startDateTime,
        timeZone: input.timeZone,
      },
      end: {
        dateTime: input.endDateTime,
        timeZone: input.timeZone,
      },
      attendees: input.attendeeEmail
        ? [{ email: input.attendeeEmail }]
        : undefined,
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 60 },
        ],
      },
      recurrence: input.recurrence && input.recurrence.length > 0 ? input.recurrence : undefined,
    };

    console.log("[Google Calendar] Sending insert request to calendar API...");

    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
    });

    const eventId = response.data.id;
    const htmlLink = response.data.htmlLink || null;

    console.log("[Google Calendar] ========== EVENT CREATION RESULT ==========");
    console.log("[Google Calendar] eventId:", eventId);
    console.log("[Google Calendar] htmlLink:", htmlLink);
    console.log("[Google Calendar] status:", response.data.status);
    console.log("[Google Calendar] ===========================================");

    if (response.data.attendees) {
      console.log("[Google Calendar] attendees:", JSON.stringify(response.data.attendees));
    }

    return { eventId: eventId ?? null, htmlLink };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Google Calendar] Create failed:", msg);
    console.error("[Google Calendar] ========== EVENT CREATION FAILED ==========");
    return { eventId: null, htmlLink: null };
  }
}

export async function getGoogleCalendarEvent(eventId: string, calendarId?: string): Promise<any> {
  const calId = calendarId || process.env.GOOGLE_CALENDAR_ID || "primary";

  console.log("[Google Calendar] Fetching event:", { calendarId: calId, eventId });

  try {
    const auth = await getOAuth2Client();
    const calendar = google.calendar({ version: "v3", auth });

    const response = await calendar.events.get({
      calendarId: calId,
      eventId,
    });

    console.log("[Google Calendar] Event fetched successfully:", response.data.id);
    return response.data;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Google Calendar] Fetch failed:", msg);
    return null;
  }
}

export function estimateEventDuration(serviceSlug: string): number {
  const DURATIONS: Record<string, number> = {
    "boat-detailing": 4,
    "gelcoat-restoration": 8,
    "ceramic-coating": 6,
    "graphene-coating": 8,
    "interior-detailing": 3,
    "wet-sanding": 10,
    "bottom-painting": 6,
    "vinyl-removal": 4,
    "weekly-maintenance-plan": 3,
    "bi-weekly-maintenance-plan": 3,
  };
  return DURATIONS[serviceSlug] ?? 4;
}

const TIMEZONE = "America/Toronto";

function addDaysToDateString(dateStr: string, daysToAdd: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const dateUtc = new Date(Date.UTC(year, month - 1, day + daysToAdd));
  const yyyy = dateUtc.getUTCFullYear();
  const mm = String(dateUtc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dateUtc.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function buildEventTimes(
  dateStr: string,
  timeSlot: string,
  durationHours: number,
): { startDateTime: string; endDateTime: string } {
  const [startTime, period] = timeSlot.split(" ");
  const [hours, minutes] = startTime.split(":").map(Number);
  let hour24 = hours;
  if (period === "PM" && hours !== 12) hour24 += 12;
  if (period === "AM" && hours === 12) hour24 = 0;

  console.log("[DateTime] selected date:", dateStr);
  console.log("[DateTime] selected time:", timeSlot);
  console.log("[DateTime] hour24:", hour24, "minutes:", minutes);
  console.log("[DateTime] timezone:", TIMEZONE);

  const startDateTime = `${dateStr}T${String(hour24).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;

  const durationMinutes = Math.round(durationHours * 60);
  const startTotalMinutes = hour24 * 60 + minutes;
  const endTotalMinutes = startTotalMinutes + durationMinutes;
  const dayOffset = Math.floor(endTotalMinutes / (24 * 60));
  const endMinutesInDay = ((endTotalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const endHour24 = Math.floor(endMinutesInDay / 60);
  const endMinute = endMinutesInDay % 60;
  const endDateStr = addDaysToDateString(dateStr, dayOffset);
  const endDateTime = `${endDateStr}T${String(endHour24).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}:00`;

  console.log("[DateTime] startDateTime:", startDateTime);
  console.log("[DateTime] endDateTime:", endDateTime);
  console.log("[DateTime] timeZone used:", TIMEZONE);

  return {
    startDateTime,
    endDateTime,
  };
}
