import { Prisma } from "@prisma/client";

import { company } from "@/content/site";
import { prisma } from "@/lib/db/prisma";
import { isMissingTableError } from "@/lib/lead-events";
import { formatCents } from "@/lib/shrink-wrap-pricing";
import { createDepositCheckoutSession, getDepositCents, isStripeConfigured } from "@/lib/stripe";

import { normalizePhone } from "./auth";
import { isDepositPaid, markDepositLinkSent } from "./caller-lookup";
import { PHONE_LINK_MINUTES, isSmsConfigured, sendSms } from "./deposit-link";
import { WINDOWS, addDays, earliestBookableDate } from "./slots";

// Two customer texts, in Marina's voice, run hourly by the follow-ups workflow:
//   nudge    — quoted 20–72 h ago, no booking, no deposit → one text with the deposit + booking links
//   reminder — booked for tomorrow → one text the afternoon before
// Each fires at most once per quote / booking (stamped in metadata) and only
// during civil hours in Toronto. Twilio handles STOP replies on its own.

export const NUDGE_MIN_HOURS = 20;
export const NUDGE_MAX_HOURS = 72;
/** Local hours (inclusive start, exclusive end) when texts may go out. */
export const NUDGE_HOURS: [number, number] = [9, 20];
export const REMINDER_HOURS: [number, number] = [15, 20];
const BATCH = 50;

export function torontoHour(now: Date): number {
  const h = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", hour: "2-digit", hour12: false }).formatToParts(now).find((p) => p.type === "hour")?.value;
  return Number(h) % 24;
}

export function inWindow(now: Date, [start, end]: [number, number]): boolean {
  const h = torontoHour(now);
  return h >= start && h < end;
}

function firstName(name: string): string {
  return name.split(" ")[0] || "there";
}

function meta(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function nudgeText(input: { firstName: string; boat: string; total: string | null; depositUrl: string | null; bookingUrl: string }): string {
  const price = input.total ? ` (${input.total} + HST)` : "";
  const pay = input.depositUrl ? ` A $250 deposit holds your date and comes off the total: ${input.depositUrl}` : "";
  return `Hi ${input.firstName}, Marina from A1 Marine Care. Your shrink wrap quote for the ${input.boat}${price} is still good and October is filling up.${pay} Or pick a date first: ${input.bookingUrl} — questions? ${company.phone}`;
}

export function reminderText(input: { firstName: string; boat: string; window: "morning" | "afternoon" }): string {
  return `Hi ${input.firstName}, Marina from A1 Marine Care — the crew is coming tomorrow ${input.window} to wrap the ${input.boat}. Please have it out of the water, on the trailer or in the driveway, with a clear path around it. If anything's changed, reply here or call ${company.phone}.`;
}

export type FollowupResult = {
  nudged: Array<{ quoteId: string; to: string }>;
  reminded: Array<{ bookingId: string; to: string }>;
  skipped: string[];
};

export async function runFollowups(now = new Date(), opts: { dryRun?: boolean } = {}): Promise<FollowupResult> {
  const result: FollowupResult = { nudged: [], reminded: [], skipped: [] };
  if (!process.env.DATABASE_URL) return { ...result, skipped: ["no database"] };
  if (!isSmsConfigured() && !opts.dryRun) return { ...result, skipped: ["sms not configured"] };

  // ---- Nudges ----------------------------------------------------------
  if (inWindow(now, NUDGE_HOURS)) {
    try {
      const quotes = await prisma.quoteLead.findMany({
        where: {
          createdAt: { gte: new Date(now.getTime() - NUDGE_MAX_HOURS * 3600_000), lte: new Date(now.getTime() - NUDGE_MIN_HOURS * 3600_000) },
          requiresManualReview: false,
          bookingRequests: { none: { NOT: { status: { in: ["cancelled", "canceled", "declined"] } } } },
        },
        orderBy: { createdAt: "asc" },
        take: BATCH,
        select: { id: true, contactName: true, contactPhone: true, contactEmail: true, boatLength: true, boatType: true, estimatedTotal: true, metadata: true },
      });
      for (const q of quotes) {
        const m = meta(q.metadata);
        if (m.formType !== "shrink-wrap-quote" || typeof m.nudgedAt === "string") continue;
        const to = normalizePhone(q.contactPhone);
        if (!to) continue;
        if (await isDepositPaid(q.id)) continue;

        const boat = `${q.boatLength} ft ${q.boatType}`;
        const bookingUrl = `${company.url}/booking?quoteId=${encodeURIComponent(q.id)}`;
        let depositUrl: string | null = null;
        if (isStripeConfigured() && !opts.dryRun) {
          try {
            const session = await createDepositCheckoutSession({
              quoteId: q.id,
              customerName: q.contactName,
              customerEmail: q.contactEmail.endsWith("@no-email.a1marinecare.ca") ? undefined : q.contactEmail,
              description: `Holds your mobile shrink wrap date for the ${boat}. Applied in full to your final invoice.`,
              amountCents: getDepositCents(),
              expiresInMinutes: PHONE_LINK_MINUTES,
              successUrl: `${company.url}/shrink-wrapping/deposit/success?session_id={CHECKOUT_SESSION_ID}`,
              cancelUrl: `${company.url}/shrink-wrapping?deposit=cancelled&quoteId=${encodeURIComponent(q.id)}#quote`,
              metadata: { boat, quotedSubtotalCents: String(q.estimatedTotal ?? ""), channel: "nudge-sms" },
            });
            depositUrl = session.url ?? null;
          } catch (err) {
            console.error("[followups] nudge session failed:", q.id, err instanceof Error ? err.message : String(err));
          }
        }
        const body = nudgeText({ firstName: firstName(q.contactName), boat, total: q.estimatedTotal != null ? formatCents(Number(q.estimatedTotal)) : null, depositUrl, bookingUrl });
        if (opts.dryRun) {
          result.nudged.push({ quoteId: q.id, to });
          continue;
        }
        const sms = await sendSms(to, body);
        if (!sms.ok) {
          console.error("[followups] nudge sms failed:", q.id, sms.error);
          continue;
        }
        await prisma.quoteLead.update({ where: { id: q.id }, data: { metadata: { ...m, nudgedAt: now.toISOString() } as Prisma.InputJsonValue } });
        if (depositUrl) void markDepositLinkSent(q.id);
        result.nudged.push({ quoteId: q.id, to });
      }
    } catch (err) {
      if (!isMissingTableError(err)) console.error("[followups] nudge pass failed:", err instanceof Error ? err.message : String(err));
    }
  } else {
    result.skipped.push("nudges: outside 9am–8pm");
  }

  // ---- Day-before reminders ------------------------------------------
  if (inWindow(now, REMINDER_HOURS)) {
    try {
      const tomorrow = addDays(earliestBookableDate(now, 0), 1);
      const bookings = await prisma.bookingRequest.findMany({
        where: { date: tomorrow, serviceSlug: "shrink-wrapping", NOT: { status: { in: ["cancelled", "canceled", "declined"] } } },
        take: BATCH,
        select: { id: true, contactName: true, contactPhone: true, timeSlot: true, metadata: true, quote: { select: { boatLength: true, boatType: true } } },
      });
      for (const b of bookings) {
        const m = meta(b.metadata);
        if (typeof m.remindedAt === "string") continue;
        const to = normalizePhone(b.contactPhone);
        if (!to) continue;
        const window = WINDOWS.afternoon.slots.includes(b.timeSlot) ? "afternoon" : "morning";
        const boat = b.quote ? `${b.quote.boatLength} ft ${b.quote.boatType}` : "boat";
        const body = reminderText({ firstName: firstName(b.contactName), boat, window });
        if (opts.dryRun) {
          result.reminded.push({ bookingId: b.id, to });
          continue;
        }
        const sms = await sendSms(to, body);
        if (!sms.ok) {
          console.error("[followups] reminder sms failed:", b.id, sms.error);
          continue;
        }
        await prisma.bookingRequest.update({ where: { id: b.id }, data: { metadata: { ...m, remindedAt: now.toISOString() } as Prisma.InputJsonValue } });
        result.reminded.push({ bookingId: b.id, to });
      }
    } catch (err) {
      if (!isMissingTableError(err)) console.error("[followups] reminder pass failed:", err instanceof Error ? err.message : String(err));
    }
  } else {
    result.skipped.push("reminders: outside 3pm–8pm");
  }

  return result;
}
