import { Prisma } from "@prisma/client";

import { company } from "@/content/site";
import { prisma } from "@/lib/db/prisma";
import { isMissingTableError } from "@/lib/lead-events";
import { formatCents } from "@/lib/shrink-wrap-pricing";
import { createDepositCheckoutSession, getDepositCents, isStripeConfigured } from "@/lib/stripe";

import { normalizePhone } from "./auth";
import { isDepositPaid, lookupCallerByPhone, markDepositLinkSent } from "./caller-lookup";
import { PHONE_LINK_MINUTES, isSmsConfigured, sendSms } from "./deposit-link";
import { WINDOWS, addDays, earliestBookableDate } from "./slots";
import type { RetellWebhookEvent } from "./webhook";

// Customer texts, in Marina's voice, run hourly by the follow-ups workflow:
//   nudge      — quoted 20–72 h ago, no booking, no deposit → one text with the deposit + booking links
//   pick-date  — deposit paid 4–72 h ago, still no booking → one text with the booking link
//   reminder   — booked for tomorrow → one text the afternoon before
// Each fires at most once per quote / booking (stamped in metadata) and only
// during civil hours in Toronto. Twilio handles STOP replies on its own.

export const NUDGE_MIN_HOURS = 20;
export const NUDGE_MAX_HOURS = 72;
export const PICK_DATE_MIN_HOURS = 4;
export const PICK_DATE_MAX_HOURS = 72;
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

export function pickDateText(input: { firstName: string; boat: string; bookingUrl: string }): string {
  return `Hi ${input.firstName}, Marina from A1 Marine Care — your $250 deposit is in and your spot for the ${input.boat} is held. Pick the morning or afternoon that works and the crew will be there: ${input.bookingUrl} Questions? ${company.phone}`;
}

export type FollowupResult = {
  nudged: Array<{ quoteId: string; to: string }>;
  pickDate: Array<{ quoteId: string; to: string }>;
  reminded: Array<{ bookingId: string; to: string }>;
  skipped: string[];
};

export async function runFollowups(now = new Date(), opts: { dryRun?: boolean } = {}): Promise<FollowupResult> {
  const result: FollowupResult = { nudged: [], pickDate: [], reminded: [], skipped: [] };
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

  // ---- Paid, but never picked a date -----------------------------------
  if (inWindow(now, NUDGE_HOURS)) {
    try {
      const paid = await prisma.leadEvent.findMany({
        where: { leadType: "shrink-wrap-deposit", createdAt: { gte: new Date(now.getTime() - PICK_DATE_MAX_HOURS * 3600_000), lte: new Date(now.getTime() - PICK_DATE_MIN_HOURS * 3600_000) } },
        orderBy: { createdAt: "asc" },
        take: BATCH,
        select: { leadId: true, metadata: true },
      });
      const seen = new Set<string>();
      for (const d of paid) {
        const quoteId = d.leadId ?? String(meta(d.metadata).quoteId ?? "");
        if (!quoteId || seen.has(quoteId)) continue;
        seen.add(quoteId);
        const q = await prisma.quoteLead.findUnique({
          where: { id: quoteId },
          select: { id: true, contactName: true, contactPhone: true, boatLength: true, boatType: true, metadata: true, bookingRequests: { where: { NOT: { status: { in: ["cancelled", "canceled", "declined"] } } }, select: { id: true }, take: 1 } },
        });
        if (!q || q.bookingRequests.length) continue;
        const m = meta(q.metadata);
        if (typeof m.pickDateTextAt === "string") continue;
        const to = normalizePhone(q.contactPhone);
        if (!to) continue;
        const boat = `${q.boatLength} ft ${q.boatType}`;
        const body = pickDateText({ firstName: firstName(q.contactName), boat, bookingUrl: `${company.url}/booking?quoteId=${encodeURIComponent(q.id)}` });
        if (opts.dryRun) {
          result.pickDate.push({ quoteId: q.id, to });
          continue;
        }
        const sms = await sendSms(to, body);
        if (!sms.ok) {
          console.error("[followups] pick-date sms failed:", q.id, sms.error);
          continue;
        }
        await prisma.quoteLead.update({ where: { id: q.id }, data: { metadata: { ...m, pickDateTextAt: now.toISOString() } as Prisma.InputJsonValue } });
        result.pickDate.push({ quoteId: q.id, to });
      }
    } catch (err) {
      if (!isMissingTableError(err)) console.error("[followups] pick-date pass failed:", err instanceof Error ? err.message : String(err));
    }
  } else {
    result.skipped.push("pick-date: outside 9am–8pm");
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

// ---- Right after a Marina call ------------------------------------------
// A caller who got a quote and hung up without a booking leaves with nothing
// in hand. As soon as Retell finishes analysing the call, text (and email,
// if we have a real address) the quote with the deposit link first.

export function postCallText(input: { firstName: string; boat: string; total: string | null; depositUrl: string | null; bookingUrl: string; booked?: boolean }): string {
  const price = input.total ? ` is ${input.total} + HST` : " is ready";
  const pay = input.depositUrl ? ` A $250 deposit holds your date and comes off the total: ${input.depositUrl}` : "";
  const book = input.booked ? "" : ` Or pick a date first: ${input.bookingUrl}`;
  return `Hi ${input.firstName}, Marina from A1 Marine Care — thanks for calling! Your shrink wrap quote for the ${input.boat}${price}.${pay}${book} Questions? ${company.phone}`;
}

export async function sendPostCallQuote(retellCallId: string | undefined, now = new Date()): Promise<{ sent: boolean; reason?: string }> {
  if (!retellCallId || !process.env.DATABASE_URL) return { sent: false, reason: "no call id" };
  try {
    const q = await prisma.quoteLead.findFirst({
      where: { metadata: { path: ["retellCallId"], equals: retellCallId } },
      orderBy: { createdAt: "desc" },
      select: { id: true, contactName: true, contactPhone: true, contactEmail: true, boatLength: true, boatType: true, estimatedTotal: true, requiresManualReview: true, metadata: true, bookingRequests: { where: { NOT: { status: { in: ["cancelled", "canceled", "declined"] } } }, select: { id: true }, take: 1 } },
    });
    if (!q) return { sent: false, reason: "no quote on this call" };
    const m = meta(q.metadata);
    if (typeof m.depositLinkSentAt === "string" || typeof m.postCallTextAt === "string") return { sent: false, reason: "already sent" };
    if (q.requiresManualReview) return { sent: false, reason: "manual review" };
    if (await isDepositPaid(q.id)) return { sent: false, reason: "paid" };
    const to = normalizePhone(q.contactPhone);
    if (!to || !isSmsConfigured()) return { sent: false, reason: "no sms" };

    const boat = `${q.boatLength} ft ${q.boatType}`;
    const bookingUrl = `${company.url}/booking?quoteId=${encodeURIComponent(q.id)}`;
    let depositUrl: string | null = null;
    if (isStripeConfigured()) {
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
          metadata: { boat, quotedSubtotalCents: String(q.estimatedTotal ?? ""), channel: "post-call-sms", retellCallId },
        });
        depositUrl = session.url ?? null;
      } catch (err) {
        console.error("[followups] post-call session failed:", q.id, err instanceof Error ? err.message : String(err));
      }
    }
    const body = postCallText({ firstName: firstName(q.contactName), boat, total: q.estimatedTotal != null ? formatCents(Number(q.estimatedTotal)) : null, depositUrl, bookingUrl, booked: q.bookingRequests.length > 0 });
    const sms = await sendSms(to, body);
    if (!sms.ok) {
      console.error("[followups] post-call sms failed:", q.id, sms.error);
      return { sent: false, reason: sms.error };
    }
    await prisma.quoteLead.update({ where: { id: q.id }, data: { metadata: { ...m, postCallTextAt: now.toISOString(), ...(depositUrl ? { depositLinkSentAt: now.toISOString() } : {}) } as Prisma.InputJsonValue } });
    console.log("[followups] post-call quote text sent", { quoteId: q.id, booked: q.bookingRequests.length > 0, deposit: Boolean(depositUrl) });
    return { sent: true };
  } catch (err) {
    if (!isMissingTableError(err)) console.error("[followups] post-call failed:", err instanceof Error ? err.message : String(err));
    return { sent: false, reason: "error" };
  }
}

// ---- Abandoned calls ----------------------------------------------------
// Some callers hang up on an AI before Marina gets to a quote. If the call was
// about shrink wrap and nothing was created, text the instant-quote link once.
// Never for transfers, voicemail, outbound calls, or a number that already has
// a quote on file (they get the post-call / nudge texts instead).

export const RECOVERY_COOLDOWN_DAYS = 7;
const SHRINK_WRAP_RE = /shrink|wrap|winteri[sz]/i;

export function abandonedCallText(): string {
  return `Hi, it's Marina from A1 Marine Care — sorry we didn't get all the way through just now. For a mobile shrink wrap price in about 30 seconds: ${company.url}/shrink-wrapping#quote — or call me back anytime at ${company.phone}.`;
}

/** Decide from the analysed call alone (no DB) whether this looks like a shrink-wrap caller who bailed. */
export function looksAbandoned(evt: RetellWebhookEvent): boolean {
  const call = evt.call ?? {};
  if (evt.event !== "call_analyzed" || !call.call_id || !call.from_number) return false;
  if (call.direction && call.direction !== "inbound") return false;
  if ((call.duration_ms ?? 0) < 15_000) return false; // wrong numbers, pocket dials
  if (call.disconnection_reason?.includes("transfer")) return false;
  const a = call.call_analysis ?? {};
  if (a.in_voicemail) return false;
  const c = a.custom_analysis_data ?? {};
  const services = Array.isArray(c.services_requested) ? c.services_requested.map(String).join(" ") : typeof c.services_requested === "string" ? c.services_requested : "";
  const text = `${services} ${a.call_summary ?? ""} ${(call.transcript ?? "").slice(0, 4000)}`;
  return SHRINK_WRAP_RE.test(text);
}

export async function sendAbandonedCallText(evt: RetellWebhookEvent, now = new Date()): Promise<{ sent: boolean; reason?: string }> {
  if (!looksAbandoned(evt)) return { sent: false, reason: "not abandoned" };
  if (!process.env.DATABASE_URL || !isSmsConfigured()) return { sent: false, reason: "not configured" };
  const call = evt.call!;
  const to = normalizePhone(call.from_number);
  if (!to) return { sent: false, reason: "bad number" };
  try {
    const [quoteOnCall, known, recent] = await Promise.all([
      prisma.quoteLead.findFirst({ where: { metadata: { path: ["retellCallId"], equals: call.call_id } }, select: { id: true } }),
      lookupCallerByPhone(to, now),
      prisma.leadEvent.findFirst({
        where: { leadType: "marina-call", phone: { endsWith: to.slice(-10) }, createdAt: { gte: new Date(now.getTime() - RECOVERY_COOLDOWN_DAYS * 86_400_000) }, metadata: { path: ["recoveryTextAt"], string_starts_with: "20" } },
        select: { id: true },
      }),
    ]);
    if (quoteOnCall) return { sent: false, reason: "quoted" };
    if (known.known) return { sent: false, reason: "known caller" };
    if (recent) return { sent: false, reason: "cooldown" };

    const sms = await sendSms(to, abandonedCallText());
    if (!sms.ok) {
      console.error("[followups] recovery sms failed:", call.call_id, sms.error);
      return { sent: false, reason: sms.error };
    }
    // recordCall runs before this, so the row for this call exists; stamp it for the cooldown.
    const row = await prisma.leadEvent.findFirst({ where: { leadType: "marina-call", metadata: { path: ["retellCallId"], equals: call.call_id } }, select: { id: true, metadata: true } });
    if (row) await prisma.leadEvent.update({ where: { id: row.id }, data: { metadata: { ...meta(row.metadata), recoveryTextAt: now.toISOString() } as Prisma.InputJsonValue } });
    console.log("[followups] recovery text sent", { callId: call.call_id });
    return { sent: true };
  } catch (err) {
    if (!isMissingTableError(err)) console.error("[followups] recovery failed:", err instanceof Error ? err.message : String(err));
    return { sent: false, reason: "error" };
  }
}
