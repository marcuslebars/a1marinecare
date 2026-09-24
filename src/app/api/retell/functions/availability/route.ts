import { NextResponse } from "next/server";

import { readRetellFunctionRequest } from "@/lib/retell/auth";
import { availableShrinkWrapSlots } from "@/lib/retell/bookings";
import { isValidDateString, parseWindow } from "@/lib/retell/slots";

export const runtime = "nodejs";

type Args = { preferred_date?: string; preferred_window?: string };

/**
 * POST /api/retell/functions/availability — Marina's `check_availability` tool.
 * Returns up to three open half-day windows with ready-to-read labels.
 */
export async function POST(request: Request) {
  const guard = await readRetellFunctionRequest<Args>(request);
  if (!guard.ok) return guard.response;
  const { args } = guard.data;

  const preferredDate = isValidDateString(args.preferred_date) ? args.preferred_date : null;
  const preferredWindow = parseWindow(args.preferred_window);

  try {
    const slots = await availableShrinkWrapSlots({ preferredDate, preferredWindow, limit: 3 });
    if (!slots.length) {
      return NextResponse.json({ ok: true, slots: [], say: "I don't have an opening in the next three weeks — Marcus will call you to squeeze it in." });
    }
    const preferredOpen = Boolean(preferredDate && preferredWindow && slots[0].date === preferredDate && slots[0].window === preferredWindow);
    return NextResponse.json({
      ok: true,
      preferred_open: preferredOpen,
      slots: slots.map((s) => ({ date: s.date, window: s.window, label: s.spokenLabel })),
      say: preferredOpen ? `${slots[0].spokenLabel} is open.` : `The next openings are ${slots.map((s) => s.spokenLabel).join(", or ")}.`,
    });
  } catch (err) {
    console.error("[Retell availability] failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: "error", say: "I can't see the calendar right now — Marcus will call to set the date." }, { status: 500 });
  }
}
