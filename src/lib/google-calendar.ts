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
  };
  return DURATIONS[serviceSlug] ?? 4;
}

const TIMEZONE = "America/Toronto";

function getTimezoneOffsetISO(timeZone: string, dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date(year, month - 1, day, 12, 0, 0));

  const getPart = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";

  const utcDate = new Date(
    Date.UTC(
      Number(getPart("year")),
      Number(getPart("month")) - 1,
      Number(getPart("day")),
      Number(getPart("hour")),
      Number(getPart("minute")),
      Number(getPart("second"))
    )
  );

  const offsetMinutes = (12 * 60 * 60 * 1000 - (utcDate.getTime() - new Date(year, month - 1, day, 12, 0, 0).getTime())) / (60 * 1000);

  const sign = offsetMinutes <= 0 ? "+" : "-";
  const absMinutes = Math.abs(Math.round(offsetMinutes));
  const offsetHours = Math.floor(absMinutes / 60);
  const offsetMins = absMinutes % 60;

  return `${sign}${String(offsetHours).padStart(2, "0")}:${String(offsetMins).padStart(2, "0")}`;
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

  const localDate = new Date(`${dateStr}T${String(hour24).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`);

  console.log("[DateTime] selected date:", dateStr);
  console.log("[DateTime] selected timeSlot:", timeSlot);
  console.log("[DateTime] hour24:", hour24, "minutes:", minutes);
  console.log("[DateTime] localDate (server interpret):", localDate.toISOString());
  console.log("[DateTime] timezone:", TIMEZONE);

  const offsetISO = getTimezoneOffsetISO(TIMEZONE, dateStr);
  console.log("[DateTime] offsetISO:", offsetISO);

  const startDateTime = `${dateStr}T${String(hour24).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00${offsetISO}`;
  const endDateTime = new Date(localDate.getTime() + durationHours * 60 * 60 * 1000).toISOString().replace(".000", "").replace("Z", offsetISO);

  console.log("[DateTime] startDateTime (final):", startDateTime);
  console.log("[DateTime] endDateTime (final):", endDateTime);

  return {
    startDateTime,
    endDateTime,
  };
}
