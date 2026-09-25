import { createHmac, timingSafeEqual } from "node:crypto";

import { prisma } from "@/lib/db/prisma";
import { createLeadEvent, isMissingTableError } from "@/lib/lead-events";
import { formatCents } from "@/lib/shrink-wrap-pricing";

import { placeholderEmailForPhone, prettyPhone } from "./auth";
import { isDepositPaid } from "./caller-lookup";
import { sendSms } from "./deposit-link";
import { callWasMissed } from "./outbound";
import { WINDOWS, spokenLabel, type Window } from "./slots";

// Retell agent webhook → owner SMS + pass-through to EmpireVu.
//
// Retell allows one webhook URL per agent, and EmpireVu already needs the
// call_analyzed event for its phone-lead intake. So the Care site takes the
// webhook, texts Marcus, and forwards the exact raw request (body + signature
// header untouched) to EmpireVu, whose own verifier still passes.

export const DEFAULT_FORWARD_URL = "https://api.empirevu.com/api/retell/webhook";
const TOLERANCE_MS = 5 * 60_000;

export type RetellWebhookEvent = {
  event: string;
  call?: {
    call_id?: string;
    call_type?: string;
    agent_id?: string;
    direction?: string;
    from_number?: string;
    to_number?: string;
    call_status?: string;
    start_timestamp?: number;
    end_timestamp?: number;
    duration_ms?: number;
    disconnection_reason?: string;
    transcript?: string;
    call_analysis?: {
      call_summary?: string;
      user_sentiment?: string;
      call_successful?: boolean;
      in_voicemail?: boolean;
      custom_analysis_data?: Record<string, unknown>;
    };
  };
};

/** `x-retell-signature: v=<unix_ms>,d=<hex>` — HMAC-SHA256(apiKey, rawBody + timestamp). Same scheme the Retell SDK's verify() uses. */
export function verifyRetellSignature(rawBody: string, header: string | null, apiKey: string | undefined, now = Date.now()): boolean {
  if (!apiKey || !header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return i === -1 ? [p.trim(), ""] : [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  ) as Record<string, string>;
  const ts = parts.v;
  const digest = parts.d;
  if (!ts || !digest || !/^\d+$/.test(ts)) return false;
  if (Math.abs(now - Number(ts)) > TOLERANCE_MS) return false;
  const expected = createHmac("sha256", apiKey).update(rawBody + ts).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(digest.toLowerCase(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function ownerSmsNumber(): string | null {
  const v = process.env.OWNER_SMS_NUMBER?.trim();
  return v && v.length >= 10 ? v : null;
}

export function ownerSmsEvents(): Set<string> {
  const raw = process.env.OWNER_SMS_EVENTS?.trim() || "call_started,call_analyzed";
  return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
}

export { prettyPhone };

function torontoTime(ms: number | undefined): string {
  const d = ms ? new Date(ms) : new Date();
  return d.toLocaleTimeString("en-CA", { timeZone: "America/Toronto", hour: "numeric", minute: "2-digit" }).toLowerCase().replace(/\s/g, "");
}

function duration(ms: number | undefined): string {
  if (!ms) return "";
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${String(s % 60).padStart(2, "0")}s`;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
}

/** What Marina actually did on this call, from our own database (more reliable than the LLM's analysis). */
export async function lookupCallOutcome(callId: string | undefined): Promise<{ quotedCents: number | null; boat: string | null; name: string | null; bookingLabel: string | null; depositPaid: boolean }> {
  const empty = { quotedCents: null, boat: null, name: null, bookingLabel: null, depositPaid: false };
  if (!callId || !process.env.DATABASE_URL) return empty;
  try {
    const quote = await prisma.quoteLead.findFirst({
      where: { metadata: { path: ["retellCallId"], equals: callId } },
      orderBy: { createdAt: "desc" },
      select: { id: true, contactName: true, boatLength: true, boatType: true, estimatedTotal: true },
    });
    const booking = await prisma.bookingRequest.findFirst({
      where: { metadata: { path: ["retellCallId"], equals: callId } },
      orderBy: { createdAt: "desc" },
      select: { date: true, timeSlot: true },
    });
    let bookingLabel: string | null = null;
    if (booking) {
      const window: Window = WINDOWS.afternoon.slots.includes(booking.timeSlot) ? "afternoon" : "morning";
      bookingLabel = spokenLabel(booking.date, window);
    }
    return {
      quotedCents: quote?.estimatedTotal != null ? Number(quote.estimatedTotal) : null,
      boat: quote ? `${quote.boatLength} ft ${quote.boatType}` : null,
      name: quote?.contactName ?? null,
      bookingLabel,
      depositPaid: quote ? await isDepositPaid(quote.id) : false,
    };
  } catch (err) {
    console.error("[Retell webhook] outcome lookup failed:", err instanceof Error ? err.message : String(err));
    return empty;
  }
}

export async function buildOwnerSms(evt: RetellWebhookEvent): Promise<string | null> {
  const call = evt.call ?? {};
  if (call.direction === "outbound") return evt.event === "call_analyzed" ? outboundOwnerSms(evt) : null; // one summary per outbound call, no "answering" text
  if (call.direction && call.direction !== "inbound") return null;
  const from = prettyPhone(call.from_number);

  if (evt.event === "call_started") {
    return `📞 Marina answering a call from ${from} (${torontoTime(call.start_timestamp)}).`;
  }

  if (evt.event === "call_analyzed") {
    const a = call.call_analysis ?? {};
    const c = a.custom_analysis_data ?? {};
    const outcome = await lookupCallOutcome(call.call_id);
    const name = outcome.name || str(c.caller_name) || "Unknown caller";
    const boat = outcome.boat || [str(c.boat_length_ft) && `${str(c.boat_length_ft)} ft`, str(c.boat_type)].filter(Boolean).join(" ");
    const services = Array.isArray(c.services_requested) ? c.services_requested.map(String).join(", ") : str(c.services_requested);
    const lines: string[] = [];
    lines.push(`📞 Marina call done · ${from} · ${duration(call.duration_ms)}${a.in_voicemail ? " · voicemail" : ""}`);
    lines.push([name, boat, services].filter(Boolean).join(" · "));
    const status: string[] = [];
    if (outcome.quotedCents != null) status.push(`Quoted ${formatCents(outcome.quotedCents)}`);
    if (outcome.bookingLabel) status.push(`Booked ${outcome.bookingLabel}`);
    else if (c.booked === true) status.push("Booked");
    if (outcome.depositPaid) status.push("deposit PAID");
    else if (c.deposit_link_sent === true) status.push("deposit link sent");
    if (call.disconnection_reason?.includes("transfer")) status.push("transferred to you");
    if (c.is_urgent === true) status.push("URGENT");
    if (status.length) lines.push(status.join(" · "));
    const summary = str(a.call_summary);
    if (summary) lines.push(summary.length > 220 ? `${summary.slice(0, 217)}…` : summary);
    return lines.filter(Boolean).join("\n");
  }

  return null;
}

/** Marina placed this call (speed-to-lead). Who, what came of it, and whether anyone picked up. */
async function outboundOwnerSms(evt: RetellWebhookEvent): Promise<string> {
  const call = evt.call ?? {};
  const c = call.call_analysis?.custom_analysis_data ?? {};
  const outcome = await lookupCallOutcome(call.call_id);
  const missed = callWasMissed(call.disconnection_reason);
  let name = outcome.name || str(c.caller_name);
  let boat = outcome.boat;
  if ((!name || !boat) && call.to_number) {
    const lead = await prisma.leadEvent.findFirst({ where: { leadType: "marina-outbound", metadata: { path: ["callId"], equals: call.call_id ?? "" } }, select: { customerName: true, boatLength: true, boatType: true } }).catch(() => null);
    name = name || lead?.customerName || "lead";
    boat = boat || (lead?.boatLength ? `${lead.boatLength} ft ${lead.boatType ?? ""}`.trim() : null);
  }
  const who = [name, boat, outcome.quotedCents != null ? formatCents(outcome.quotedCents) : ""].filter(Boolean).join(" · ");
  const status: string[] = [];
  if (missed) status.push(missed === "voicemail" ? "voicemail left" : "no answer");
  if (outcome.bookingLabel) status.push(`Booked ${outcome.bookingLabel}`);
  if (outcome.depositPaid) status.push("deposit PAID");
  else if (c.deposit_link_sent === true) status.push("deposit link sent");
  if (call.disconnection_reason?.includes("transfer")) status.push("transferred to you");
  const summary = str(call.call_analysis?.call_summary);
  return [`📤 Marina called ${prettyPhone(call.to_number)} · ${who} · ${duration(call.duration_ms)}`.replace(/ · $/, ""), status.join(" · "), !missed && summary ? (summary.length > 220 ? `${summary.slice(0, 217)}…` : summary) : ""].filter(Boolean).join("\n");
}

/** Durable one-row-per-call log in lead_events (leadType "marina-call") — what the digest counts. */
export async function recordCall(evt: RetellWebhookEvent): Promise<void> {
  const call = evt.call ?? {};
  if (evt.event !== "call_analyzed" || !call.call_id || !process.env.DATABASE_URL) return;
  if (call.direction && call.direction !== "inbound" && call.direction !== "outbound") return;
  const outbound = call.direction === "outbound";
  try {
    const dup = await prisma.leadEvent.findFirst({ where: { leadType: "marina-call", metadata: { path: ["retellCallId"], equals: call.call_id } }, select: { id: true } });
    if (dup) return;
    const a = call.call_analysis ?? {};
    const c = a.custom_analysis_data ?? {};
    const outcome = await lookupCallOutcome(call.call_id);
    const phone = (outbound ? call.to_number : call.from_number) ?? "";
    const name = outcome.name || (typeof c.caller_name === "string" && c.caller_name.trim()) || "Unknown caller";
    await createLeadEvent({
      source: "contact",
      customerName: name,
      email: phone ? placeholderEmailForPhone(phone) : "unknown@no-email.a1marinecare.ca",
      phone,
      serviceInterest: Array.isArray(c.services_requested) ? c.services_requested.map(String).join(", ") : typeof c.services_requested === "string" ? c.services_requested : "phone call",
      boatLength: outcome.boat ? outcome.boat.split(" ")[0] : undefined,
      boatType: outcome.boat ? outcome.boat.split(" ").slice(2).join(" ") : undefined,
      message: typeof a.call_summary === "string" ? a.call_summary : undefined,
      leadType: "marina-call",
      rawPayload: { durationMs: call.duration_ms ?? null, disconnectionReason: call.disconnection_reason ?? null, sentiment: a.user_sentiment ?? null, successful: a.call_successful ?? null, voicemail: a.in_voicemail ?? null },
      metadata: { retellCallId: call.call_id, channel: "marina", direction: outbound ? "outbound" : "inbound", missed: callWasMissed(call.disconnection_reason), quotedCents: outcome.quotedCents, booked: Boolean(outcome.bookingLabel), depositPaid: outcome.depositPaid, transferred: Boolean(call.disconnection_reason?.includes("transfer")), urgent: c.is_urgent === true },
    });
  } catch (err) {
    if (!isMissingTableError(err)) console.error("[Retell webhook] call log failed:", err instanceof Error ? err.message : String(err));
  }
}

export async function notifyOwner(evt: RetellWebhookEvent): Promise<void> {
  const to = ownerSmsNumber();
  if (!to || !ownerSmsEvents().has(evt.event)) return;
  const body = await buildOwnerSms(evt);
  if (!body) return;
  const res = await sendSms(to, body);
  if (!res.ok) console.error("[Retell webhook] owner sms failed:", res.error);
  else console.log("[Retell webhook] owner sms sent", { event: evt.event, callId: evt.call?.call_id, sid: res.sid });
}

/** Pass the exact request through to EmpireVu so its own Retell signature check still passes. */
export async function forwardToEmpireVu(rawBody: string, signature: string | null): Promise<void> {
  const url = process.env.RETELL_FORWARD_WEBHOOK_URL?.trim() ?? DEFAULT_FORWARD_URL;
  if (!url || url === "off") return;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...(signature ? { "x-retell-signature": signature } : {}) },
      body: rawBody,
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) console.error("[Retell webhook] forward failed:", res.status, await res.text().catch(() => ""));
  } catch (err) {
    console.error("[Retell webhook] forward error:", err instanceof Error ? err.message : String(err));
  }
}
