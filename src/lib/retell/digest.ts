import { prisma } from "@/lib/db/prisma";
import { isMissingTableError } from "@/lib/lead-events";
import { formatCents } from "@/lib/shrink-wrap-pricing";

import { sendSms } from "./deposit-link";
import { WINDOWS, addDays, earliestBookableDate, torontoDayRange } from "./slots";
import { ownerSmsNumber, prettyPhone } from "./webhook";

// The 7am text: what Marina and the website did yesterday, who quoted but
// didn't book (today's call-back list), and what's on the calendar today.

export const CALL_LEAD_TYPE = "marina-call";
const PAID_UNBOOKED_DAYS = 14;

export { torontoDayRange };

export type Digest = {
  forDate: string;
  calls: number;
  outboundCalls: number;
  quotes: number;
  phoneQuotes: number;
  quotedCents: number;
  bookings: number;
  deposits: number;
  depositCents: number;
  unbooked: Array<{ name: string; phone: string; boat: string; totalCents: number | null }>;
  paidUnbooked: Array<{ name: string; phone: string; boat: string }>;
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

  const empty: Digest = { forDate: yesterday, calls: 0, outboundCalls: 0, quotes: 0, phoneQuotes: 0, quotedCents: 0, bookings: 0, deposits: 0, depositCents: 0, unbooked: [], paidUnbooked: [], todayMorning: 0, todayAfternoon: 0, todayNames: [], text: "" };
  if (!process.env.DATABASE_URL) return { ...empty, text: `☀️ Marina digest for ${dayLabel(yesterday)}: no database connected.` };

  try {
    const [calls, quotes, bookings, deposits, todays, recentPaid, outboundCalls] = await Promise.all([
      prisma.leadEvent.count({ where: { leadType: CALL_LEAD_TYPE, createdAt: { gte: start, lt: end } } }),
      prisma.quoteLead.findMany({
        where: { createdAt: { gte: start, lt: end } },
        select: { id: true, contactName: true, contactPhone: true, boatLength: true, boatType: true, estimatedTotal: true, metadata: true, bookingRequests: { select: { id: true }, take: 1 } },
      }),
      prisma.bookingRequest.count({ where: { createdAt: { gte: start, lt: end }, serviceSlug: "shrink-wrapping" } }),
      prisma.leadEvent.findMany({ where: { leadType: "shrink-wrap-deposit", createdAt: { gte: start, lt: end } }, select: { leadId: true, metadata: true } }),
      prisma.bookingRequest.findMany({ where: { date: today, serviceSlug: "shrink-wrapping", NOT: { status: { in: ["cancelled", "canceled", "declined"] } } }, select: { timeSlot: true, contactName: true } }),
      prisma.leadEvent.findMany({ where: { leadType: "shrink-wrap-deposit", createdAt: { gte: new Date(now.getTime() - PAID_UNBOOKED_DAYS * 86_400_000), lt: start } }, select: { leadId: true, metadata: true } }),
      prisma.leadEvent.count({ where: { leadType: CALL_LEAD_TYPE, createdAt: { gte: start, lt: end }, metadata: { path: ["direction"], equals: "outbound" } } }),
    ]);

    // Deposit paid in the last two weeks (before yesterday — yesterday's are counted above) but still no date picked.
    const paidIds = [...new Set(recentPaid.map((d) => d.leadId ?? String((d.metadata as Record<string, unknown> | null)?.quoteId ?? "")).filter(Boolean))];
    const paidQuotes = paidIds.length
      ? await prisma.quoteLead.findMany({ where: { id: { in: paidIds } }, select: { id: true, contactName: true, contactPhone: true, boatLength: true, boatType: true, bookingRequests: { where: { NOT: { status: { in: ["cancelled", "canceled", "declined"] } } }, select: { id: true }, take: 1 } } })
      : [];
    const paidUnbooked = paidQuotes.filter((q) => q.bookingRequests.length === 0).map((q) => ({ name: q.contactName, phone: prettyPhone(q.contactPhone), boat: `${q.boatLength} ft ${q.boatType}` })).slice(0, 6);

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
    lines.push(`☀️ Marina · ${dayLabel(yesterday)}: ${calls} call${calls === 1 ? "" : "s"}${outboundCalls ? ` (${outboundCalls} Marina placed)` : ""} · ${wrapQuotes.length} quote${wrapQuotes.length === 1 ? "" : "s"}${phoneQuotes ? ` (${phoneQuotes} by phone)` : ""} ${quotedCents ? `worth ${formatCents(quotedCents)}` : ""} · ${bookings} booked · ${deposits.length} deposit${deposits.length === 1 ? "" : "s"}${depositCents ? ` (${formatCents(depositCents)})` : ""}`.replace(/\s+·/g, " ·").replace(/\s{2,}/g, " "));
    if (unbooked.length) {
      lines.push(`Quoted, not booked — call today:`);
      for (const u of unbooked) lines.push(`• ${u.name} ${u.phone} · ${u.boat}${u.totalCents != null ? ` · ${formatCents(u.totalCents)}` : ""}`);
    }
    if (paidUnbooked.length) {
      lines.push(`Deposit paid, no date yet:`);
      for (const u of paidUnbooked) lines.push(`• ${u.name} ${u.phone} · ${u.boat}`);
    }
    if (todays.length) {
      lines.push(`Today: ${todayMorning} AM / ${todayAfternoon} PM — ${todays.map((b) => b.contactName.split(" ")[0]).join(", ")}`);
    } else {
      lines.push("Today: nothing booked yet.");
    }

    return { forDate: yesterday, calls, outboundCalls, quotes: wrapQuotes.length, phoneQuotes, quotedCents, bookings, deposits: deposits.length, depositCents, unbooked, paidUnbooked, todayMorning, todayAfternoon, todayNames: todays.map((b) => b.contactName), text: lines.join("\n") };
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
