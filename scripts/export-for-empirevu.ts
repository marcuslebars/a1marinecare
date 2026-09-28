/**
 * Export what EmpireVu needs to take over Marina's calendar — READ-ONLY.
 *
 *   DATABASE_URL=… npx tsx scripts/export-for-empirevu.ts > a1-care-export.json
 *   (or on Railway: railway run npx tsx scripts/export-for-empirevu.ts > a1-care-export.json)
 *
 * Writes one JSON document to stdout:
 *   • bookings  — every booking_requests row dated today or later that isn't cancelled
 *                 (all services: they all take the crew, so they all count for capacity)
 *   • quotes    — shrink-wrap quotes from the last N days (default 45) plus any quote a
 *                 future booking points at, each with its paid-deposit record if any
 *
 * Nothing is written to this database. The file contains customer names, phones and
 * emails: import it into EmpireVu (`npm run job:import-a1-care -- --file …`), then delete it.
 *
 * Options: --days 45   how far back to take quotes
 */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { prisma } from "@/lib/db/prisma";

const CANCELLED = ["cancelled", "canceled", "declined"];
const TIMEZONE = "America/Toronto";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export async function exportForEmpireVu(now = new Date(), days = 45) {
  const since = new Date(now.getTime() - days * 86_400_000);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(now);

  const bookings = await prisma.bookingRequest.findMany({
    where: { date: { gte: today }, NOT: { status: { in: CANCELLED } } },
    orderBy: [{ date: "asc" }, { timeSlot: "asc" }],
  });

  const recentQuotes = await prisma.quoteLead.findMany({
    where: { createdAt: { gte: since }, metadata: { path: ["formType"], equals: "shrink-wrap-quote" } },
    orderBy: { createdAt: "asc" },
  });
  const haveQuote = new Set(recentQuotes.map((q) => q.id));
  const bookedQuoteIds = [...new Set(bookings.map((b) => b.quoteId).filter((id): id is string => Boolean(id) && !haveQuote.has(id!)))];
  const bookedQuotes = bookedQuoteIds.length ? await prisma.quoteLead.findMany({ where: { id: { in: bookedQuoteIds } } }) : [];
  const quotes = [...recentQuotes, ...bookedQuotes];

  // A future booking can reference a quote (and paid deposit) from any date.
  // Restrict by the exported quote IDs, never by the payment's age.
  const quoteIds = quotes.map((q) => q.id);
  const deposits = quoteIds.length ? await prisma.leadEvent.findMany({
    where: {
      leadType: "shrink-wrap-deposit",
      OR: [
        { leadId: { in: quoteIds } },
        ...quoteIds.map((id) => ({ metadata: { path: ["quoteId"], equals: id } })),
      ],
    },
    select: { leadId: true, metadata: true, createdAt: true, rawPayload: true },
    orderBy: { createdAt: "asc" },
  }) : [];
  const paidByQuote = new Map<string, { paidAt: string; stripeSessionId: string | null; amountCents: number | null }>();
  for (const d of deposits) {
    const m = obj(d.metadata);
    const quoteId = d.leadId || (typeof m.quoteId === "string" ? m.quoteId : null);
    if (!quoteId || paidByQuote.has(quoteId)) continue;
    const raw = obj(d.rawPayload);
    const session = obj(raw.session);
    const amount = Number(m.depositCents ?? session.amount_total ?? raw.amountTotal ?? raw.amount_total ?? m.amountCents ?? NaN);
    paidByQuote.set(quoteId, {
      paidAt: d.createdAt.toISOString(),
      stripeSessionId: typeof m.stripeSessionId === "string" ? m.stripeSessionId : null,
      amountCents: Number.isFinite(amount) ? amount : null,
    });
  }

  const out = {
    source: "a1marinecare",
    exportedAt: now.toISOString(),
    timezone: TIMEZONE,
    quoteDays: days,
    quotes: quotes.map((q) => {
      const m = obj(q.metadata);
      return {
        id: q.id,
        createdAt: q.createdAt.toISOString(),
        contactName: q.contactName,
        contactEmail: q.contactEmail,
        contactPhone: q.contactPhone,
        boatLength: q.boatLength,
        boatType: q.boatType,
        services: q.services,
        addons: q.addons,
        locationSlug: q.locationSlug,
        notes: q.notes,
        estimatedTotalCents: q.estimatedTotal != null ? Number(q.estimatedTotal) : null,
        requiresManualReview: q.requiresManualReview,
        channel: typeof m.channel === "string" ? m.channel : null,
        retellCallId: typeof m.retellCallId === "string" ? m.retellCallId : null,
        emailPlaceholder: m.emailPlaceholder === true,
        depositLinkSentAt: typeof m.depositLinkSentAt === "string" ? m.depositLinkSentAt : null,
        deposit: paidByQuote.get(q.id) ?? null,
      };
    }),
    bookings: bookings.map((b) => ({
      id: b.id,
      createdAt: b.createdAt.toISOString(),
      quoteId: b.quoteId,
      serviceSlug: b.serviceSlug,
      locationSlug: b.locationSlug,
      date: b.date,
      timeSlot: b.timeSlot,
      contactName: b.contactName,
      contactEmail: b.contactEmail,
      contactPhone: b.contactPhone,
      notes: b.notes,
      status: b.status,
      window: typeof obj(b.metadata).window === "string" ? (obj(b.metadata).window as string) : null,
    })),
  };

  return out;
}

async function main(): Promise<void> {
  const days = Math.max(1, Number(arg("days", "45")) || 45);
  const out = await exportForEmpireVu(new Date(), days);
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
  console.error(
    `[export] ${out.quotes.length} quotes (${out.quotes.filter((q) => q.deposit).length} with a paid deposit), ` +
      `${out.bookings.length} upcoming bookings. Contains customer PII — delete the file after importing.`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main()
    .catch((err) => {
      console.error("[export] failed:", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
