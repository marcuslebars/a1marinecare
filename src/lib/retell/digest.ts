import { prisma } from "@/lib/db/prisma";
import { isMissingTableError } from "@/lib/lead-events";
import { formatCents } from "@/lib/shrink-wrap-pricing";

import { sendSms } from "./deposit-link";
import { WINDOWS, addDays, earliestBookableDate } from "./slots";
import { ownerSmsNumber, prettyPhone } from "./webhook";

// The 7am text: what Marina and the website did yesterday, who quoted but
// didn't book (today's call-back list), and what's on the calendar today.

export const CALL_LEAD_TYPE = "marina-call";

/** Toronto-local day boundaries as UTC instants. */
export function torontoDayRange(dateStr: string): { start: Date; end: Date } {
  // Offset for that date: -04:00 (EDT) or -05:00 (EST). Probe noon UTC on the date.
  const probe = new Date(`${dateStr}T12:00:00Z`);
  const local = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", hour: "2-digit", hour12: false }).formatToParts(probe).find((p) => p.type === "hour")?.value;
  const offsetHours = 12 - (Number(local) % 24); // 4 in summer, 5 in winter
  const start = new Date(`${dateStr}T00:00:00Z`);
  start.setUTCHours(start.getUTCHours() + offsetHours);
  const end = new Date(start.getTime() + 24 * 3600_000);
  return { start, end };
}

export type Digest = {
  forDate: string;
  calls: number;
  quotes: number;
  phoneQuotes: number;
  quotedCents: number;
  bookings: number;
  deposits: number;
  depositCents: number;
  unbooked: Array<{ name: string; phone: string; boat: string; totalCents: number | null }>;
  todayMorning: number;
  todayAfternoon: number;
  todayNames: string[];
  text: string;
};

function dayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

export async function buildDigest(now = new Date()): Promise<Digest> {
  const today = earliestBookableDate(now, 0);
  const yesterday = addDays(today, -1);
  const { start, end } = torontoDayRange(yesterday);

  const empty: Digest = { forDate: yesterday, calls: 0, quotes: 0, phoneQuotes: 0, quotedCents: 0, bookings: 0, deposits: 0, depositCents: 0, unbooked: [], todayMorning: 0, todayAfternoon: 0, todayNames: [], text: "" };
  if (!process.env.DATABASE_URL) return { ...empty, text: `☀️ Marina digest for ${dayLabel(yesterday)}: no database connected.` };

  try {
    const [calls, quotes, bookings, deposits, todays] = await Promise.all([
      prisma.leadEvent.count({ where: { leadType: CALL_LEAD_TYPE, createdAt: { gte: start, lt: end } } }),
      prisma.quoteLead.findMany({
        where: { createdAt: { gte: start, lt: end } },
        select: { id: true, contactName: true, contactPhone: true, boatLength: true, boatType: true, estimatedTotal: true, metadata: true, bookingRequests: { select: { id: true }, take: 1 } },
      }),
      prisma.bookingRequest.count({ where: { createdAt: { gte: start, lt: end }, serviceSlug: "shrink-wrapping" } }),
      prisma.leadEvent.findMany({ where: { leadType: "shrink-wrap-deposit", createdAt: { gte: start, lt: end } }, select: { leadId: true, metadata: true } }),
      prisma.bookingRequest.findMany({ where: { date: today, serviceSlug: "shrink-wrapping", NOT: { status: { in: ["cancelled", "canceled", "declined"] } } }, select: { timeSlot: true, contactName: true } }),
    ]);

    const wrapQuotes = quotes.filter((q) => (q.metadata as Record<string, unknown> | null)?.formType === "shrink-wrap-quote");
    const phoneQuotes = wrapQuotes.filter((q) => (q.metadata as Record<string, unknown> | null)?.channel === "marina").length;
    const quotedCents = wrapQuotes.reduce((s, q) => s + (q.estimatedTotal != null ? Number(q.estimatedTotal) : 0), 0);
    const depositCents = deposits.reduce((s, d) => s + (Number((d.metadata as Record<string, unknown> | null)?.depositCents) || 0), 0);
    const paidQuoteIds = new Set(deposits.map((d) => d.leadId ?? String((d.metadata as Record<string, unknown> | null)?.quoteId ?? "")));

    const unbooked = wrapQuotes
      .filter((q) => q.bookingRequests.length === 0 && !paidQuoteIds.has(q.id))
      .map((q) => ({ name: q.contactName, phone: prettyPhone(q.contactPhone), boat: `${q.boatLength} ft ${q.boatType}`, totalCents: q.estimatedTotal != null ? Number(q.estimatedTotal) : null }))
      .slice(0, 6);

    const todayMorning = todays.filter((b) => WINDOWS.morning.slots.includes(b.timeSlot)).length;
    const todayAfternoon = todays.length - todayMorning;

    const lines: string[] = [];
    lines.push(`☀️ Marina · ${dayLabel(yesterday)}: ${calls} call${calls === 1 ? "" : "s"} · ${wrapQuotes.length} quote${wrapQuotes.length === 1 ? "" : "s"}${phoneQuotes ? ` (${phoneQuotes} by phone)` : ""} ${quotedCents ? `worth ${formatCents(quotedCents)}` : ""} · ${bookings} booked · ${deposits.length} deposit${deposits.length === 1 ? "" : "s"}${depositCents ? ` (${formatCents(depositCents)})` : ""}`.replace(/\s+·/g, " ·").replace(/\s{2,}/g, " "));
    if (unbooked.length) {
      lines.push(`Quoted, not booked — call today:`);
      for (const u of unbooked) lines.push(`• ${u.name} ${u.phone} · ${u.boat}${u.totalCents != null ? ` · ${formatCents(u.totalCents)}` : ""}`);
    }
    if (todays.length) {
      lines.push(`Today: ${todayMorning} AM / ${todayAfternoon} PM — ${todays.map((b) => b.contactName.split(" ")[0]).join(", ")}`);
    } else {
      lines.push("Today: nothing booked yet.");
    }

    return { forDate: yesterday, calls, quotes: wrapQuotes.length, phoneQuotes, quotedCents, bookings, deposits: deposits.length, depositCents, unbooked, todayMorning, todayAfternoon, todayNames: todays.map((b) => b.contactName), text: lines.join("\n") };
  } catch (err) {
    if (!isMissingTableError(err)) console.error("[digest] failed:", err instanceof Error ? err.message : String(err));
    return { ...empty, text: `☀️ Marina digest for ${dayLabel(yesterday)}: couldn't read the database.` };
  }
}

export async function sendDigest(now = new Date()): Promise<{ sent: boolean; digest: Digest; error?: string }> {
  const digest = await buildDigest(now);
  const to = ownerSmsNumber();
  if (!to) return { sent: false, digest, error: "OWNER_SMS_NUMBER not set" };
  const res = await sendSms(to, digest.text);
  if (!res.ok) console.error("[digest] sms failed:", res.error);
  return { sent: res.ok, digest, error: res.error };
}
