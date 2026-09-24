import { NextResponse } from "next/server";

import { loadSlotCounts } from "@/lib/retell/bookings";
import { CAPACITY_PER_WINDOW, WINDOWS, WORKING_DAYS, bookedCount, earliestBookableDate, isValidDateString, weekdayOf } from "@/lib/retell/slots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/shrink-wrap/availability?date=YYYY-MM-DD — open half-day windows
 * for the website booking page, using the same capacity rule Marina uses.
 */
export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date");
  const earliestDate = earliestBookableDate(new Date());
  if (!isValidDateString(date)) return NextResponse.json({ ok: false, error: "date required (YYYY-MM-DD)", earliestDate }, { status: 400 });

  const workingDay = WORKING_DAYS.has(weekdayOf(date));
  const tooSoon = date < earliestDate;
  const counts = workingDay && !tooSoon ? await loadSlotCounts(date, date).catch(() => []) : [];
  const windows = Object.fromEntries(
    (Object.keys(WINDOWS) as Array<keyof typeof WINDOWS>).map((w) => {
      const used = bookedCount(counts, date, w);
      const open = workingDay && !tooSoon && used < CAPACITY_PER_WINDOW;
      return [w, { open, remaining: open ? CAPACITY_PER_WINDOW - used : 0, slots: WINDOWS[w].slots }];
    }),
  );
  return NextResponse.json({ ok: true, date, earliestDate, workingDay, tooSoon, capacity: CAPACITY_PER_WINDOW, windows }, { headers: { "cache-control": "no-store" } });
}
