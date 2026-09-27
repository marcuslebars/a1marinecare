import { createHmac, timingSafeEqual } from "node:crypto";

import { company } from "@/content/site";
import { prisma } from "@/lib/db/prisma";
import { createLeadEvent, isMissingTableError } from "@/lib/lead-events";

import { normalizePhone, placeholderEmailForPhone, prettyPhone } from "./auth";
import { lookupCallerByPhone, type CallerProfile } from "./caller-lookup";
import { sendSms } from "./deposit-link";
import { queueOutboundCall } from "./outbound";
import { earliestBookableDate } from "./slots";
import { ownerSmsNumber } from "./webhook";

// Customers reply to Marina's texts ("reply here or call…"). Twilio POSTs each
// reply to /api/sms/inbound; we relay it to Marcus with who-this-is context,
// log it, and send the customer a short ack. If the reply reads like interest
// ("yes", "can you do Tuesday?", "call me") Marina calls them back in a couple
// of minutes instead of leaving it to a text thread. Twilio's own opt-out
// handling (STOP / START / HELP) runs before the webhook, so those never need replies.

export const ACK_COOLDOWN_HOURS = 24;
export const INBOUND_LEAD_TYPE = "customer-sms";
/** A texter gets at most one Marina call per this many hours, even if they keep texting. */
export const REPLY_CALL_DEDUPE_HOURS = 1;
const OPT_OUT_RE = /^\s*(stop|stopall|unsubscribe|cancel|end|quit|start|unstop|help|info)\s*$/i;

/** Hard no — never call, whatever else the text says. */
const HARD_NO_RE = /\b(not interested|wrong number|don'?t (call|text|contact|bother)|do not (call|text|contact)|not (to )?(call|text)|stop (calling|texting)|no (more )?calls?|remove me|leave me alone|unsubscribe|scam|spam)\b/i;
const YES_RE = /\b(yes|yeah|yep|yup|sure|absolutely|please call|call me|give me a call|book( it| me)?|schedule|reserve|hold (it|the|that|a)|lock (it|that) in|let'?s do it|sign me up|go ahead)\b/i;
/** Soft no — a polite decline or a done deal; relay only, unless the text also clearly says yes. */
const SOFT_NO_RE = /\b(no|nope|nah|no thanks?|already (done|booked|wrapped|have|sorted|paid)|not (now|this year|anymore|yet))\b/i;
const INTEREST_RE = /\?|\b(when|what time|how much|how soon|price|quote|available|availability|date|day|week|weekend|morning|afternoon|tomorrow|today|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thurs|fri|sat|sun|works?( for me)?|interested|ready|sooner|earlier|later|deposit|link|pay)\b/i;

/**
 * Does this reply want a human-ish response now? Yeses, questions and
 * date-talk get a call; "no thanks" / "already done" / "ok" / "thanks" just relay to Marcus.
 */
export function wantsCallback(body: string): boolean {
  const text = body.trim();
  if (!text || isOptOutKeyword(text) || HARD_NO_RE.test(text)) return false;
  if (YES_RE.test(text)) return true;
  if (SOFT_NO_RE.test(text)) return false;
  return INTEREST_RE.test(text);
}

/** Twilio: base64(HMAC-SHA1(authToken, url + sorted(key+value)…)). The url must be exactly what Twilio requested. */
export function twilioSignatureFor(url: string, params: Record<string, string>, authToken: string): string {
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  return createHmac("sha1", authToken).update(data, "utf8").digest("base64");
}

export function verifyTwilioSignature(candidateUrls: string[], params: Record<string, string>, header: string | null, authToken: string | undefined): boolean {
  if (!authToken || !header) return false;
  const given = Buffer.from(header, "utf8");
  for (const url of candidateUrls) {
    const expected = Buffer.from(twilioSignatureFor(url, params, authToken), "utf8");
    if (expected.length === given.length && timingSafeEqual(expected, given)) return true;
  }
  return false;
}

/** The URLs Twilio might have signed for this request: as configured (www / bare host), with or without a query string. */
export function candidateUrls(requestUrl: string, pathname: string): string[] {
  const out = new Set<string>();
  try {
    const u = new URL(requestUrl);
    out.add(u.toString());
    out.add(`https://${u.host}${u.pathname}${u.search}`);
  } catch {
    /* ignore */
  }
  const site = new URL(company.url);
  const bare = site.host.replace(/^www\./, "");
  for (const host of [site.host, bare, `www.${bare}`]) out.add(`https://${host}${pathname}`);
  return [...out];
}

export function isOptOutKeyword(body: string): boolean {
  return OPT_OUT_RE.test(body);
}

function context(p: CallerProfile): string {
  if (!p.known) return "new number, no quote on file";
  const bits = [p.boat];
  if (p.quoteTotal) bits.push(`quoted ${p.quoteTotal}`);
  if (p.bookedWindow) bits.push(`booked ${p.bookedWindow}`);
  if (p.depositPaid) bits.push("deposit PAID");
  else if (p.depositLinkSent) bits.push("deposit link sent");
  return bits.filter(Boolean).join(" · ");
}

export function relayText(p: CallerProfile, from: string, body: string, note?: string): string {
  const who = p.known ? p.fullName || p.firstName || prettyPhone(from) : prettyPhone(from);
  const msg = body.length > 400 ? `${body.slice(0, 397)}…` : body;
  return `💬 Text from ${who} (${context(p)})\n"${msg}"\n${note ? `${note}\n` : ""}Reply to them at ${prettyPhone(from)}`;
}

/** When Marina's call will come, in the customer's words: "in a couple of minutes" / "at 9 tomorrow morning". */
export function callTiming(dueAt: Date, now: Date): string {
  const waitMin = (dueAt.getTime() - now.getTime()) / 60_000;
  if (waitMin <= 10) return "in a couple of minutes";
  const hour = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", hour: "numeric", hour12: false }).format(dueAt));
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const when = earliestBookableDate(dueAt, 0) === earliestBookableDate(now, 0) ? "this morning" : "tomorrow morning";
  return `at ${h12} ${when}`;
}

export function ackText(p: CallerProfile, call?: { dueAt: Date; now: Date }): string {
  const hi = p.firstName ? `Thanks ${p.firstName}` : "Thanks";
  if (call) {
    const from = process.env.RETELL_FROM_NUMBER ? ` — it'll come from ${prettyPhone(process.env.RETELL_FROM_NUMBER)}` : "";
    return `${hi} — got it. I'll give you a quick call ${callTiming(call.dueAt, call.now)}${from}. Or call ${company.phone} anytime.`;
  }
  return `${hi} — got your message. Marcus will text you back shortly. Anything urgent, call ${company.phone}.`;
}

export type InboundSmsResult = { relayed: boolean; acked: boolean; callQueued: boolean; reason?: string };

export async function handleInboundSms(params: { From?: string; To?: string; Body?: string; MessageSid?: string }, now = new Date()): Promise<InboundSmsResult> {
  const from = normalizePhone(params.From);
  const body = (params.Body ?? "").trim();
  if (!from || !body) return { relayed: false, acked: false, callQueued: false, reason: "empty" };
  if (isOptOutKeyword(body)) return { relayed: false, acked: false, callQueued: false, reason: "keyword" };

  // Don't relay Marcus's own texts back to himself if he ever texts the line.
  const owner = ownerSmsNumber();
  if (owner && normalizePhone(owner) === from) return { relayed: false, acked: false, callQueued: false, reason: "owner" };

  const profile = await lookupCallerByPhone(from, now);

  let recentAck = false;
  if (process.env.DATABASE_URL) {
    try {
      const prior = await prisma.leadEvent.findFirst({
        where: { leadType: INBOUND_LEAD_TYPE, phone: from, createdAt: { gte: new Date(now.getTime() - ACK_COOLDOWN_HOURS * 3600_000) }, metadata: { path: ["acked"], equals: true } },
        select: { id: true },
      });
      recentAck = Boolean(prior);
    } catch (err) {
      if (!isMissingTableError(err)) console.error("[inbound sms] ack lookup failed:", err instanceof Error ? err.message : String(err));
    }
  }

  // Interested? Marina calls back rather than leaving it to a text thread.
  let call: { queued: boolean; id?: string; dueAt?: string; reason?: string } = { queued: false, reason: "not wanted" };
  if (wantsCallback(body)) {
    call = await queueOutboundCall({ to: from, name: profile.fullName || null, reason: "sms-reply", quoteId: profile.quoteId || null, detail: body.slice(0, 300), dedupeHours: REPLY_CALL_DEDUPE_HOURS }, now);
  }

  let relayed = false;
  if (owner) {
    const note = call.queued && call.dueAt ? `📞 Marina is calling them back ${callTiming(new Date(call.dueAt), now)}.` : undefined;
    const res = await sendSms(owner, relayText(profile, from, body, note));
    relayed = res.ok;
    if (!res.ok) console.error("[inbound sms] relay failed:", res.error);
  }

  // The "I'll call you" ack always goes (they need to know to pick up); the plain ack once a day.
  let acked = false;
  if (call.queued || !recentAck) {
    const res = await sendSms(from, ackText(profile, call.queued && call.dueAt ? { dueAt: new Date(call.dueAt), now } : undefined));
    acked = res.ok;
    if (!res.ok) console.error("[inbound sms] ack failed:", res.error);
  }

  if (process.env.DATABASE_URL) {
    try {
      await createLeadEvent({
        source: "contact",
        customerName: profile.fullName || "Unknown texter",
        email: placeholderEmailForPhone(from),
        phone: from,
        serviceInterest: profile.services || "text reply",
        boatLength: profile.boat ? profile.boat.split(" ")[0] : undefined,
        boatType: profile.boat ? profile.boat.split(" ").slice(2).join(" ") : undefined,
        message: body,
        leadId: profile.quoteId || undefined,
        leadType: INBOUND_LEAD_TYPE,
        rawPayload: { messageSid: params.MessageSid ?? null, to: params.To ?? null },
        metadata: { channel: "sms", relayed, acked, known: profile.known, quoteId: profile.quoteId || null, callQueued: call.queued, callId: call.id ?? null, callSkipped: call.queued ? null : call.reason ?? null },
      });
    } catch (err) {
      if (!isMissingTableError(err)) console.error("[inbound sms] log failed:", err instanceof Error ? err.message : String(err));
    }
  }

  console.log("[inbound sms]", { from: prettyPhone(from), known: profile.known, relayed, acked, callQueued: call.queued, callSkipped: call.queued ? undefined : call.reason });
  return { relayed, acked, callQueued: call.queued };
}
