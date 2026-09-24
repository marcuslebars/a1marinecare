// Half-day booking windows for mobile shrink wrap, offered by Marina on the phone.
//
// The website booking flow stores `date` (YYYY-MM-DD) + `timeSlot` ("08:00" …
// "16:00") on booking_requests. Marina books by half-day instead — a wrap is a
// 2–4 hour job and the crew routes by area — so a window maps onto one of
// those slot strings for storage and the calendar event, and capacity is
// counted across every slot string that falls inside the window.

export type Window = "morning" | "afternoon";

export const SHRINK_WRAP_SERVICE_SLUG = "shrink-wrapping";
export const TIMEZONE = "America/Toronto";

export const WINDOWS: Record<Window, { slot: string; slots: string[]; spoken: string }> = {
  morning: { slot: "09:00", slots: ["08:00", "09:00", "10:00", "11:00"], spoken: "in the morning" },
  afternoon: { slot: "13:00", slots: ["13:00", "14:00", "15:00", "16:00"], spoken: "in the afternoon" },
};

export const CAPACITY_PER_WINDOW = Number(process.env.SHRINK_WRAP_CAPACITY_PER_WINDOW ?? 2) || 2;
/** Don't offer anything sooner than this many hours out. */
export const LEAD_TIME_HOURS = Number(process.env.SHRINK_WRAP_LEAD_TIME_HOURS ?? 24) || 24;
/** How far ahead Marina may book. */
export const HORIZON_DAYS = 21;
/** 0 = Sunday. Crew works Mon–Sat in wrap season. */
export const WORKING_DAYS = new Set([1, 2, 3, 4, 5, 6]);

export type SlotCount = { date: string; timeSlot: string; count: number };

export type AvailableSlot = {
  date: string;
  window: Window;
  timeSlot: string;
  spokenLabel: string;
  remaining: number;
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Local calendar date parts in America/Toronto for an instant. */
function torontoParts(at: Date): { y: number; m: number; d: number; hour: number; weekday: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = Object.fromEntries(fmt.formatToParts(at).map((p) => [p.type, p.value]));
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  return { y: Number(parts.year), m: Number(parts.month), d: Number(parts.day), hour: Number(parts.hour) % 24, weekday };
}

export function toDateString(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return toDateString(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

export function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

/** "Tuesday, September 29th in the morning" — formatted server-side so the LLM never parses dates. */
export function spokenLabel(dateStr: string, window: Window): string {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${DAYS[weekdayOf(dateStr)]}, ${MONTHS[m - 1]} ${ordinal(d)} ${WINDOWS[window].spoken}`;
}

export function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() + 1 === m && t.getUTCDate() === d;
}

export function parseWindow(value: unknown): Window | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v.startsWith("morn") || v === "am") return "morning";
  if (v.startsWith("after") || v === "pm") return "afternoon";
  return null;
}

/** The first date Marina may offer, honouring lead time. */
export function earliestBookableDate(now: Date, leadTimeHours = LEAD_TIME_HOURS): string {
  const p = torontoParts(new Date(now.getTime() + leadTimeHours * 3600_000));
  return toDateString(p.y, p.m, p.d);
}

export function bookedCount(counts: SlotCount[], date: string, window: Window): number {
  const slots = new Set(WINDOWS[window].slots);
  return counts.filter((c) => c.date === date && slots.has(c.timeSlot)).reduce((sum, c) => sum + c.count, 0);
}

export function isWindowOpen(counts: SlotCount[], date: string, window: Window, capacity = CAPACITY_PER_WINDOW): boolean {
  return bookedCount(counts, date, window) < capacity;
}

export type AvailabilityQuery = {
  now: Date;
  counts: SlotCount[];
  preferredDate?: string | null;
  preferredWindow?: Window | null;
  limit?: number;
  capacity?: number;
  horizonDays?: number;
};

/**
 * Next open half-day windows, nearest first. If a preferred date/window is
 * given and open it comes first; otherwise the nearest alternatives follow
 * (from the preferred date forward, else from the earliest bookable date).
 */
export function findAvailableSlots(q: AvailabilityQuery): AvailableSlot[] {
  const limit = q.limit ?? 3;
  const capacity = q.capacity ?? CAPACITY_PER_WINDOW;
  const horizon = q.horizonDays ?? HORIZON_DAYS;
  const earliest = earliestBookableDate(q.now);
  const lastDate = addDays(earliest, horizon);

  let start = earliest;
  if (q.preferredDate && isValidDateString(q.preferredDate) && q.preferredDate > earliest) start = q.preferredDate;

  const results: AvailableSlot[] = [];
  const push = (date: string, window: Window) => {
    if (results.some((r) => r.date === date && r.window === window)) return;
    const used = bookedCount(q.counts, date, window);
    if (used >= capacity) return;
    results.push({ date, window, timeSlot: WINDOWS[window].slot, spokenLabel: spokenLabel(date, window), remaining: capacity - used });
  };

  // Preferred exact window first, if it's open.
  if (q.preferredDate && q.preferredWindow && start === q.preferredDate && WORKING_DAYS.has(weekdayOf(start))) {
    push(start, q.preferredWindow);
  }

  for (let date = start; date <= lastDate && results.length < limit; date = addDays(date, 1)) {
    if (!WORKING_DAYS.has(weekdayOf(date))) continue;
    const order: Window[] = q.preferredWindow === "afternoon" ? ["afternoon", "morning"] : ["morning", "afternoon"];
    for (const w of order) {
      if (results.length >= limit) break;
      push(date, w);
    }
  }
  return results.slice(0, limit);
}
