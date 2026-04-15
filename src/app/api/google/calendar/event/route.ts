import { NextRequest, NextResponse } from "next/server";
import { getGoogleCalendarEvent } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const eventId = searchParams.get("eventId");
  const calendarId = searchParams.get("calendarId") || undefined;

  if (!eventId) {
    return NextResponse.json(
      { error: "Missing required parameter: eventId" },
      { status: 400 }
    );
  }

  console.log("[Debug] Fetching Google Calendar event:", { eventId, calendarId });

  const event = await getGoogleCalendarEvent(eventId, calendarId);

  if (!event) {
    return NextResponse.json(
      { error: "Event not found or fetch failed" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    event: {
      id: event.id,
      summary: event.summary,
      description: event.description,
      start: event.start,
      end: event.end,
      location: event.location,
      htmlLink: event.htmlLink,
      status: event.status,
      attendees: event.attendees,
    },
  });
}
