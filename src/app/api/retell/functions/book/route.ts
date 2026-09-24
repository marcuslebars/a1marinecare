import { NextResponse } from "next/server";

import { readRetellFunctionRequest } from "@/lib/retell/auth";
import { bookShrinkWrapWindow } from "@/lib/retell/bookings";
import { isValidDateString, parseWindow } from "@/lib/retell/slots";

export const runtime = "nodejs";

type Args = { quote_id?: string; date?: string; window?: string };

/**
 * POST /api/retell/functions/book — Marina's `book_wrap_date` tool.
 * Creates the booking (calendar event + owner email + CRM) for a quote.
 */
export async function POST(request: Request) {
  const guard = await readRetellFunctionRequest<Args>(request);
  if (!guard.ok) return guard.response;
  const { args, call } = guard.data;

  const quoteId = typeof args.quote_id === "string" ? args.quote_id.trim() : "";
  const window = parseWindow(args.window);
  const missing: string[] = [];
  if (quoteId.length < 8) missing.push("quote_id");
  if (!isValidDateString(args.date)) missing.push("date");
  if (!window) missing.push("window");
  if (missing.length) {
    return NextResponse.json({ ok: false, reason: "missing_info", missing, say: "I need the quote, the date, and whether it's morning or afternoon." });
  }

  try {
    const result = await bookShrinkWrapWindow({ quoteId, date: args.date as string, window: window!, retellCallId: call.callId, fromNumber: call.fromNumber });
    if (!result.ok) {
      return NextResponse.json({
        ok: false,
        reason: result.reason,
        alternatives: result.alternatives?.map((s) => ({ date: s.date, window: s.window, label: s.spokenLabel })) ?? [],
        say: result.alternatives?.length ? `${result.say} ${result.alternatives.map((s) => s.spokenLabel).join(", or ")}.` : result.say,
      });
    }
    return NextResponse.json({
      ok: true,
      booking_id: result.bookingId,
      date: result.date,
      window: result.window,
      label: result.spokenLabel,
      calendar_synced: Boolean(result.calendarEventId),
      say: result.confirmationLine,
    });
  } catch (err) {
    console.error("[Retell book] failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: "error", say: "The booking didn't save. Marcus will call you within the hour to lock it in." }, { status: 500 });
  }
}
