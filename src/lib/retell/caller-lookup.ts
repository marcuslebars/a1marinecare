import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { isMissingTableError } from "@/lib/lead-events";
import { formatCents } from "@/lib/shrink-wrap-pricing";

import { WINDOWS, earliestBookableDate, spokenLabel, type Window } from "./slots";

// Who is calling? Looked up by phone before Marina answers (Retell's inbound
// call webhook) so she can greet a returning caller by name and pick up where
// they left off. Everything here is read-only and best-effort: any failure
// returns "unknown caller" and the call proceeds normally.

export type CallerProfile = {
  known: boolean;
  firstName: string;
  fullName: string;
  boat: string;
  services: string;
  quoteId: string;
  quoteTotal: string;
  quoteAgeLabel: string;
  quotedAt: Date | null;
  bookedWindow: string;
  bookedDate: string;
  depositPaid: boolean;
  depositLinkSent: boolean;
};

export const UNKNOWN_CALLER: CallerProfile = {
  known: false,
  firstName: "",
  fullName: "",
  boat: "",
  services: "",
  quoteId: "",
  quoteTotal: "",
  quoteAgeLabel: "",
  quotedAt: null,
  bookedWindow: "",
  bookedDate: "",
  depositPaid: false,
  depositLinkSent: false,
};

export function last10(phone: string | null | undefined): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : null;
}

export function ageLabel(at: Date, now = new Date()): string {
  const days = Math.floor((now.getTime() - at.getTime()) / 86_400_000);
  if (days <= 0) return "earlier today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "last week";
  return `${Math.round(days / 7)} weeks ago`;
}

/** Has a $250 deposit been recorded for this quote (Stripe webhook → lead_events)? */
export async function isDepositPaid(quoteId: string | null | undefined): Promise<boolean> {
  if (!quoteId || !process.env.DATABASE_URL) return false;
  try {
    const row = await prisma.leadEvent.findFirst({
      where: { leadType: "shrink-wrap-deposit", OR: [{ leadId: quoteId }, { metadata: { path: ["quoteId"], equals: quoteId } }] },
      select: { id: true },
    });
    return Boolean(row);
  } catch (err) {
    if (!isMissingTableError(err)) console.error("[caller lookup] deposit check failed:", err instanceof Error ? err.message : String(err));
    return false;
  }
}

/** Remember that Marina sent the link, so a returning caller isn't offered it as if it were new. */
export async function markDepositLinkSent(quoteId: string): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    const q = await prisma.quoteLead.findUnique({ where: { id: quoteId }, select: { metadata: true } });
    const meta = (q?.metadata && typeof q.metadata === "object" ? (q.metadata as Record<string, unknown>) : {}) ?? {};
    await prisma.quoteLead.update({ where: { id: quoteId }, data: { metadata: { ...meta, depositLinkSentAt: new Date().toISOString() } as Prisma.InputJsonValue } });
  } catch (err) {
    console.error("[caller lookup] mark link sent failed:", err instanceof Error ? err.message : String(err));
  }
}

type QuoteRow = { id: string; created_at: Date; contact_name: string; boat_length: string; boat_type: string; services: string[]; estimated_total: bigint | number | null; metadata: unknown };

/** Latest shrink-wrap quote for a phone number, matching on the last 10 digits regardless of how the number was typed. */
async function latestQuoteByPhone(digits: string): Promise<QuoteRow | null> {
  const rows = await prisma.$queryRaw<QuoteRow[]>(
    Prisma.sql`
      SELECT id, created_at, contact_name, boat_length, boat_type, services, estimated_total, metadata
      FROM quote_leads
      WHERE regexp_replace(contact_phone, '\\D', '', 'g') LIKE ${"%" + digits}
        AND metadata->>'formType' = 'shrink-wrap-quote'
        AND created_at > now() - interval '120 days'
      ORDER BY created_at DESC
      LIMIT 1
    `,
  );
  return rows[0] ?? null;
}

export async function lookupCallerByPhone(phone: string | null | undefined, now = new Date()): Promise<CallerProfile> {
  const digits = last10(phone);
  if (!digits || !process.env.DATABASE_URL) return UNKNOWN_CALLER;
  try {
    const quote = await latestQuoteByPhone(digits);
    if (!quote) return UNKNOWN_CALLER;

    const today = earliestBookableDate(now, 0); // Toronto calendar date
    const [booking, depositPaid] = await Promise.all([
      prisma.bookingRequest.findFirst({
        where: { quoteId: quote.id, date: { gte: today }, NOT: { status: { in: ["cancelled", "canceled", "declined"] } } },
        orderBy: { date: "asc" },
        select: { date: true, timeSlot: true },
      }),
      isDepositPaid(quote.id),
    ]);

    const meta = (quote.metadata && typeof quote.metadata === "object" ? (quote.metadata as Record<string, unknown>) : {}) ?? {};
    const bookedWindow: Window | null = booking ? (WINDOWS.afternoon.slots.includes(booking.timeSlot) ? "afternoon" : "morning") : null;
    const total = quote.estimated_total != null ? Number(quote.estimated_total) : null;

    return {
      known: true,
      firstName: (quote.contact_name || "").split(" ")[0] || "",
      fullName: quote.contact_name || "",
      boat: `${quote.boat_length} ft ${quote.boat_type}`,
      services: Array.isArray(quote.services) ? quote.services.join(", ") : "",
      quoteId: quote.id,
      quoteTotal: total != null ? formatCents(total) : "",
      quoteAgeLabel: ageLabel(new Date(quote.created_at), now),
      quotedAt: new Date(quote.created_at),
      bookedWindow: booking && bookedWindow ? spokenLabel(booking.date, bookedWindow) : "",
      bookedDate: booking?.date ?? "",
      depositPaid,
      depositLinkSent: typeof meta.depositLinkSentAt === "string",
    };
  } catch (err) {
    if (!isMissingTableError(err)) console.error("[caller lookup] failed:", err instanceof Error ? err.message : String(err));
    return UNKNOWN_CALLER;
  }
}

/** The dynamic variables Marina's prompt reads. Every value is a string; unknown → empty string, never undefined. */
export function toDynamicVariables(p: CallerProfile): Record<string, string> {
  const greeting = p.known
    ? `Thanks for calling A1 Marine Care, this is Marina. Hi ${p.firstName} — are you calling about the ${p.boat}?`
    : "Thanks for calling A1 Marine Care, this is Marina. Are you calling about shrink wrapping, or something else?";
  return {
    greeting,
    caller_known: p.known ? "true" : "false",
    caller_first_name: p.firstName,
    caller_boat: p.boat,
    caller_services: p.services,
    quote_id: p.quoteId,
    quote_total: p.quoteTotal,
    quote_age: p.quoteAgeLabel,
    booked_window: p.bookedWindow,
    deposit_paid: p.depositPaid ? "true" : "false",
    deposit_link_sent: p.depositLinkSent ? "true" : "false",
  };
}
