import { Prisma } from "@prisma/client";

import { company } from "@/content/site";
import { prisma } from "@/lib/db/prisma";
import { createLeadEvent, isMissingTableError } from "@/lib/lead-events";

import { normalizePhone, placeholderEmailForPhone, prettyPhone } from "./auth";
import { lookupCallerByPhone, toDynamicVariables } from "./caller-lookup";
import { sendSms } from "./deposit-link";
import { inWindow, torontoHour } from "./followups";
import { addDays, earliestBookableDate, torontoDayRange } from "./slots";
import type { RetellWebhookEvent } from "./webhook";

// Speed to lead: Marina calls a web lead a couple of minutes after they submit
// a form, while the quote is still on their screen. Same agent as inbound, so
// she can book a date and send the deposit link on the spot.
//
// One lead_events row per intended call (leadType "marina-outbound") is the
// queue: queued → placed → done | skipped | failed. Calls are placed either by
// the in-process timer right after the form, or by the hourly follow-ups run
// (which also catches anything the timer missed across a deploy).

export const OUTBOUND_LEAD_TYPE = "marina-outbound";
/** Local hours (inclusive start, exclusive end) when Marina may place calls. */
export const CALL_HOURS: [number, number] = [9, 20];
export const DEFAULT_DELAY_MINUTES = 2;
export const DEFAULT_DEDUPE_HOURS = 24;

/** One call per number per this many hours. OUTBOUND_DEDUPE_HOURS=0 while testing. */
export function dedupeHours(): number {
  const n = Number(process.env.OUTBOUND_DEDUPE_HOURS);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_DEDUPE_HOURS;
}
const RETELL_CREATE_CALL = "https://api.retellai.com/v2/create-phone-call";

export type OutboundReason = "shrink-wrap-quote" | "contact";

export type OutboundRequest = {
  to: string | null | undefined;
  name: string;
  reason: OutboundReason;
  /** Quote id for shrink-wrap leads (Marina reuses it to book + send the deposit link). */
  quoteId?: string | null;
  /** What the contact form said, for the contact reason. */
  detail?: string | null;
};

export function isOutboundConfigured(): boolean {
  return Boolean(process.env.RETELL_API_KEY && process.env.RETELL_AGENT_ID && process.env.RETELL_FROM_NUMBER);
}

export function delayMinutes(): number {
  const n = Number(process.env.OUTBOUND_CALL_DELAY_MINUTES);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_DELAY_MINUTES;
}

/** 9:00 Toronto on the given local date, as a UTC instant. */
function nineAm(dateStr: string): Date {
  return new Date(torontoDayRange(dateStr).start.getTime() + CALL_HOURS[0] * 3600_000);
}

/** When a call requested at `now` should actually be placed: after the delay, and inside calling hours. */
export function scheduleFor(now: Date, delayMin = delayMinutes()): Date {
  const earliest = new Date(now.getTime() + delayMin * 60_000);
  if (inWindow(earliest, CALL_HOURS)) return earliest;
  const today = earliestBookableDate(earliest, 0);
  return torontoHour(earliest) < CALL_HOURS[0] ? nineAm(today) : nineAm(addDays(today, 1));
}

function meta(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "there";
}

export function outboundGreeting(input: { firstName: string; reason: OutboundReason; boat?: string; total?: string; detail?: string | null }): string {
  if (input.reason === "shrink-wrap-quote") {
    const price = input.total ? ` — it came to ${input.total} plus tax` : "";
    return `Hi, is this ${input.firstName}? It's Marina from A1 Marine Care. You just priced a shrink wrap for your ${input.boat || "boat"} on our site${price}. I wanted to see if I can lock in a date for you while it's fresh — got a quick minute?`;
  }
  const about = input.detail ? ` about ${input.detail}` : "";
  return `Hi, is this ${input.firstName}? It's Marina from A1 Marine Care — you just sent us a message${about}. Got a quick minute?`;
}

export function missedCallText(input: { firstName: string; reason: OutboundReason }): string {
  const what = input.reason === "shrink-wrap-quote" ? "your shrink wrap quote — the deposit and booking links are in your email" : "your message";
  return `Hi ${input.firstName}, Marina from A1 Marine Care — just tried to call about ${what}. Reply here or call ${company.phone} and I'll sort it out.`;
}

/** Retell's outbound disconnection reasons that mean nobody talked to Marina. */
export function callWasMissed(reason: string | undefined): "no answer" | "voicemail" | null {
  if (!reason) return null;
  if (/no_answer|busy|dial_failed|dial_error/.test(reason)) return "no answer";
  if (/voicemail|machine/.test(reason)) return "voicemail";
  return null;
}

/**
 * Same question, but from the whole analysed call: also catches call-screening
 * services and unflagged voicemails, where Retell reports agent_hangup because
 * Marina gave up after nobody real answered.
 */
export function outboundCallMissed(call: { direction?: string; disconnection_reason?: string; duration_ms?: number; transcript?: string; call_analysis?: { in_voicemail?: boolean; call_summary?: string } }): "no answer" | "voicemail" | null {
  const byReason = callWasMissed(call.disconnection_reason);
  if (byReason) return byReason;
  if (call.direction !== "outbound") return null;
  if (call.call_analysis?.in_voicemail) return "voicemail";
  if (call.disconnection_reason === "agent_hangup") {
    const text = `${call.call_analysis?.call_summary ?? ""} ${call.transcript ?? ""}`;
    if (/screening|record your name|voicemail|voice mail|not available|leave a message|after the tone/i.test(text)) return "no answer";
  }
  return null;
}

// Timers so the first attempt happens ~2 min after the form without waiting for the hourly cron.
const timers = new Map<string, NodeJS.Timeout>();

export async function queueOutboundCall(req: OutboundRequest, now = new Date()): Promise<{ queued: boolean; id?: string; dueAt?: string; reason?: string }> {
  const skip = (reason: string) => {
    console.log("[outbound] not queued:", reason, { to: prettyPhone(req.to), reason: req.reason });
    return { queued: false, reason };
  };
  if (!isOutboundConfigured()) return skip("not configured (RETELL_AGENT_ID / RETELL_FROM_NUMBER)");
  if (!process.env.DATABASE_URL) return skip("no database");
  const to = normalizePhone(req.to);
  if (!to) return skip("no dialable number");

  try {
    const hours = dedupeHours();
    const dup = hours > 0
      ? await prisma.leadEvent.findFirst({
          where: { leadType: OUTBOUND_LEAD_TYPE, phone: to, createdAt: { gte: new Date(now.getTime() - hours * 3600_000) } },
          select: { id: true },
        })
      : null;
    if (dup) return skip(`already called in the last ${hours}h`);

    const dueAt = scheduleFor(now);
    const row = await createLeadEvent({
      source: req.reason === "contact" ? "contact" : "quote",
      customerName: req.name,
      email: placeholderEmailForPhone(to),
      phone: to,
      serviceInterest: req.reason === "contact" ? req.detail ?? "contact form" : "Shrink Wrapping",
      message: req.detail ?? undefined,
      leadId: req.quoteId ?? undefined,
      leadType: OUTBOUND_LEAD_TYPE,
      rawPayload: {},
      metadata: { status: "queued", reason: req.reason, quoteId: req.quoteId ?? null, detail: req.detail ?? null, dueAt: dueAt.toISOString() },
    });

    // Arm an in-process timer for anything due within 14 h (covers the overnight
    // queue, so a 9:00 call goes at 9:00). The hourly workflow remains the safety
    // net if the process restarts and the timer is lost.
    const waitMs = dueAt.getTime() - now.getTime();
    if (waitMs <= 14 * 3600_000) {
      const t = setTimeout(() => {
        timers.delete(row.id);
        void placeQueuedCall(row.id).catch((err) => console.error("[outbound] timer place failed:", err instanceof Error ? err.message : String(err)));
      }, Math.max(0, waitMs));
      timers.set(row.id, t);
    }
    console.log("[outbound] queued", { id: row.id, to: prettyPhone(to), reason: req.reason, dueAt: dueAt.toISOString() });
    return { queued: true, id: row.id, dueAt: dueAt.toISOString() };
  } catch (err) {
    if (!isMissingTableError(err)) console.error("[outbound] queue failed:", err instanceof Error ? err.message : String(err));
    return { queued: false, reason: "error" };
  }
}

async function setStatus(id: string, current: Record<string, unknown>, patch: Record<string, unknown>): Promise<void> {
  await prisma.leadEvent.update({ where: { id }, data: { metadata: { ...current, ...patch } as Prisma.InputJsonValue } });
}

/** Place one queued call now (re-checks everything first). Returns what happened. */
export async function placeQueuedCall(id: string, now = new Date()): Promise<{ placed: boolean; callId?: string; reason?: string }> {
  if (!isOutboundConfigured() || !process.env.DATABASE_URL) return { placed: false, reason: "not configured" };
  const row = await prisma.leadEvent.findUnique({ where: { id }, select: { id: true, phone: true, customerName: true, metadata: true } });
  if (!row) return { placed: false, reason: "gone" };
  const m = meta(row.metadata);
  if (m.status !== "queued") return { placed: false, reason: String(m.status) };
  if (typeof m.dueAt === "string" && new Date(m.dueAt).getTime() > now.getTime() + 1000) return { placed: false, reason: "not due" };
  if (!inWindow(now, CALL_HOURS)) return { placed: false, reason: "outside calling hours" };

  const reason = (m.reason as OutboundReason) || "contact";
  const quoteId = typeof m.quoteId === "string" ? m.quoteId : null;
  const profile = await lookupCallerByPhone(row.phone, now);

  // Re-check: did they finish on their own while we waited?
  if (quoteId) {
    const quote = await prisma.quoteLead.findUnique({ where: { id: quoteId }, select: { requiresManualReview: true, estimatedTotal: true, boatLength: true, boatType: true } });
    if (quote?.requiresManualReview) {
      await setStatus(id, m, { status: "skipped", skipReason: "manual review — Marcus quotes" });
      return { placed: false, reason: "manual review" };
    }
    if (profile.depositPaid && profile.bookedWindow) {
      await setStatus(id, m, { status: "skipped", skipReason: "already booked and paid" });
      return { placed: false, reason: "already booked and paid" };
    }
  }

  const first = firstName(row.customerName);
  const boat = profile.boat || undefined;
  const total = profile.quoteTotal || undefined;
  const greeting = outboundGreeting({ firstName: first, reason, boat, total, detail: typeof m.detail === "string" ? m.detail : null });
  const dynamic = {
    ...toDynamicVariables(profile),
    greeting,
    caller_known: "true",
    caller_first_name: profile.firstName || first,
    outbound_reason: reason,
    outbound_detail: typeof m.detail === "string" ? m.detail.slice(0, 300) : "",
  };

  try {
    const res = await fetch(RETELL_CREATE_CALL, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.RETELL_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from_number: process.env.RETELL_FROM_NUMBER,
        to_number: row.phone,
        override_agent_id: process.env.RETELL_AGENT_ID,
        retell_llm_dynamic_variables: dynamic,
        metadata: { outboundId: id, quoteId: quoteId ?? "", reason },
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as { call_id?: string; message?: string; error?: string };
    if (!res.ok || !json.call_id) {
      const error = json.message ?? json.error ?? `retell ${res.status}`;
      console.error("[outbound] create call failed:", error);
      await setStatus(id, m, { status: "failed", error, failedAt: now.toISOString() });
      return { placed: false, reason: error };
    }
    await setStatus(id, m, { status: "placed", callId: json.call_id, placedAt: now.toISOString() });
    console.log("[outbound] placed", { id, callId: json.call_id, to: prettyPhone(row.phone), reason });
    return { placed: true, callId: json.call_id };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[outbound] create call error:", error);
    await setStatus(id, m, { status: "failed", error, failedAt: now.toISOString() });
    return { placed: false, reason: error };
  }
}

/** Hourly: place everything queued and due (also the safety net if the in-process timer was lost). */
export async function runOutboundQueue(now = new Date(), opts: { dryRun?: boolean } = {}): Promise<{ called: Array<{ id: string; to: string }>; skipped: string[] }> {
  const out: { called: Array<{ id: string; to: string }>; skipped: string[] } = { called: [], skipped: [] };
  if (!isOutboundConfigured()) return { ...out, skipped: ["outbound: not configured"] };
  if (!process.env.DATABASE_URL) return out;
  if (!inWindow(now, CALL_HOURS)) return { ...out, skipped: ["outbound: outside 9am–8pm"] };
  try {
    const rows = await prisma.leadEvent.findMany({
      where: { leadType: OUTBOUND_LEAD_TYPE, createdAt: { gte: new Date(now.getTime() - 3 * 86_400_000) }, metadata: { path: ["status"], equals: "queued" } },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: { id: true, phone: true, metadata: true },
    });
    for (const r of rows) {
      const due = meta(r.metadata).dueAt;
      if (typeof due === "string" && new Date(due).getTime() > now.getTime()) continue;
      if (opts.dryRun) {
        out.called.push({ id: r.id, to: r.phone });
        continue;
      }
      const res = await placeQueuedCall(r.id, now);
      if (res.placed) out.called.push({ id: r.id, to: r.phone });
      else out.skipped.push(`outbound ${r.id.slice(0, 8)}: ${res.reason}`);
    }
  } catch (err) {
    if (!isMissingTableError(err)) console.error("[outbound] queue run failed:", err instanceof Error ? err.message : String(err));
  }
  return out;
}

/** After Retell analyses an outbound call: close the queue row, and text once if nobody picked up. */
export async function afterOutboundCall(evt: RetellWebhookEvent, now = new Date()): Promise<void> {
  const call = evt.call ?? {};
  if (evt.event !== "call_analyzed" || call.direction !== "outbound" || !call.call_id || !process.env.DATABASE_URL) return;
  try {
    const row = await prisma.leadEvent.findFirst({ where: { leadType: OUTBOUND_LEAD_TYPE, metadata: { path: ["callId"], equals: call.call_id } }, select: { id: true, phone: true, customerName: true, metadata: true } });
    if (!row) return;
    const m = meta(row.metadata);
    const missed = outboundCallMissed(call);
    const patch: Record<string, unknown> = { status: "done", outcome: missed ?? "answered", disconnectionReason: call.disconnection_reason ?? null, durationMs: call.duration_ms ?? null, doneAt: now.toISOString() };
    if (missed && typeof m.missedTextAt !== "string") {
      const sms = await sendSms(row.phone, missedCallText({ firstName: firstName(row.customerName), reason: (m.reason as OutboundReason) || "contact" }));
      if (sms.ok) patch.missedTextAt = now.toISOString();
      else console.error("[outbound] missed-call text failed:", sms.error);
    }
    await setStatus(row.id, m, patch);
  } catch (err) {
    if (!isMissingTableError(err)) console.error("[outbound] after-call failed:", err instanceof Error ? err.message : String(err));
  }
}
