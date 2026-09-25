import { createHmac, timingSafeEqual } from "node:crypto";

import { company } from "@/content/site";
import { prisma } from "@/lib/db/prisma";
import { createLeadEvent, isMissingTableError } from "@/lib/lead-events";

import { normalizePhone, placeholderEmailForPhone } from "./auth";
import { lookupCallerByPhone, type CallerProfile } from "./caller-lookup";
import { sendSms } from "./deposit-link";
import { ownerSmsNumber, prettyPhone } from "./webhook";

// Customers reply to Marina's texts ("reply here or call…"). Twilio POSTs each
// reply to /api/sms/inbound; we relay it to Marcus with who-this-is context,
// log it, and send the customer a short ack. Twilio's own opt-out handling
// (STOP / START / HELP) runs before the webhook, so those never need replies.

export const ACK_COOLDOWN_HOURS = 24;
export const INBOUND_LEAD_TYPE = "customer-sms";
const OPT_OUT_RE = /^\s*(stop|stopall|unsubscribe|cancel|end|quit|start|unstop|help|info)\s*$/i;

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

export function relayText(p: CallerProfile, from: string, body: string): string {
  const who = p.known ? p.fullName || p.firstName || prettyPhone(from) : prettyPhone(from);
  const msg = body.length > 400 ? `${body.slice(0, 397)}…` : body;
  return `💬 Text from ${who} (${context(p)})\n"${msg}"\nReply to them at ${prettyPhone(from)}`;
}

export function ackText(p: CallerProfile): string {
  const hi = p.firstName ? `Thanks ${p.firstName}` : "Thanks";
  return `${hi} — got your message. Marcus will text you back shortly. Anything urgent, call ${company.phone}.`;
}

export type InboundSmsResult = { relayed: boolean; acked: boolean; reason?: string };

export async function handleInboundSms(params: { From?: string; To?: string; Body?: string; MessageSid?: string }, now = new Date()): Promise<InboundSmsResult> {
  const from = normalizePhone(params.From);
  const body = (params.Body ?? "").trim();
  if (!from || !body) return { relayed: false, acked: false, reason: "empty" };
  if (isOptOutKeyword(body)) return { relayed: false, acked: false, reason: "keyword" };

  // Don't relay Marcus's own texts back to himself if he ever texts the line.
  const owner = ownerSmsNumber();
  if (owner && normalizePhone(owner) === from) return { relayed: false, acked: false, reason: "owner" };

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

  let relayed = false;
  if (owner) {
    const res = await sendSms(owner, relayText(profile, from, body));
    relayed = res.ok;
    if (!res.ok) console.error("[inbound sms] relay failed:", res.error);
  }

  let acked = false;
  if (!recentAck) {
    const res = await sendSms(from, ackText(profile));
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
        metadata: { channel: "sms", relayed, acked, known: profile.known, quoteId: profile.quoteId || null },
      });
    } catch (err) {
      if (!isMissingTableError(err)) console.error("[inbound sms] log failed:", err instanceof Error ? err.message : String(err));
    }
  }

  console.log("[inbound sms]", { from: prettyPhone(from), known: profile.known, relayed, acked });
  return { relayed, acked };
}
