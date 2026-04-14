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

export async function createGoogleCalendarEvent(input: CalendarEventInput): Promise<string | null> {
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

    console.log("[Google Calendar] Creating event:", input.summary);

    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
      requestBody: event,
    });

    const eventId = response.data.id;
    console.log("[Google Calendar] Event created:", eventId);
    return eventId ?? null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Google Calendar] Create failed:", msg);
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

  const startDate = new Date(`${dateStr}T${String(hour24).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`);
  const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);

  const toISOString = (d: Date) =>
    d.toISOString().replace(".000", "");

  return {
    startDateTime: toISOString(startDate),
    endDateTime: toISOString(endDate),
  };
}
