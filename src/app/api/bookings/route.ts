import { NextResponse } from "next/server";

import { createBookingLead } from "@/lib/leads";
import { bookingSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = bookingSchema.parse(payload);

    console.log("[Booking Create] payload received:", {
      serviceSlug: parsed.serviceSlug,
      locationSlug: parsed.locationSlug,
      quoteId: parsed.quoteId,
    });

    const record = await createBookingLead(parsed);

    console.log("[Booking Create] created ID:", record.id, "| calendar event:", record.googleCalendarEventId);

    return NextResponse.json({
      success: true,
      id: record.id,
      createdAt: record.createdAt,
      googleCalendarEventId: record.googleCalendarEventId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Booking Create] FAILED:", msg);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to create booking",
      },
      { status: 400 },
    );
  }
}
