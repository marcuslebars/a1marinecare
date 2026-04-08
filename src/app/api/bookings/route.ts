import { NextResponse } from "next/server";

import { createBookingLead } from "@/lib/leads";
import { bookingSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = bookingSchema.parse(payload);

    const record = await createBookingLead(parsed);

    return NextResponse.json({
      success: true,
      id: record.id,
      createdAt: record.createdAt,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Unable to create booking",
      },
      { status: 400 },
    );
  }
}
