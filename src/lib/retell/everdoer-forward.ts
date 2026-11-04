import { createHmac } from "node:crypto";

// Hand A1's customer texts to Everdoer's texting agent.
//
// The A1 line (TWILIO_FROM_NUMBER) keeps its "A message comes in" webhook on this site, so
// Marcus's own texts (his "Y 42" call approvals, outbound-approval.ts) are still handled here.
// Every other text is forwarded, unchanged, to Everdoer's Twilio inbound route and signed with
// the same account's auth token exactly as Twilio would sign it, so Everdoer verifies and
// processes it as a normal inbound text: its agent replies from the A1 line, asks Marcus by text
// (from the Everdoer platform number) before anything that needs him, and keeps the conversation
// in Everdoer's Inbox.
//
// Off unless EVERDOER_SMS_FORWARD_URL is set. If a forward fails, the caller falls back to the
// old relay + ack, so no customer text is ever lost.

const FORWARD_TIMEOUT_MS = 8_000;

/**
 * Twilio's request signature: base64(HMAC-SHA1(authToken, url + sorted(key + value)…)). Same
 * algorithm as inbound-sms.ts twilioSignatureFor (kept here so the two modules don't import
 * each other; a test checks they agree).
 */
export function signForTwilio(url: string, params: Record<string, string>, authToken: string): string {
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  return createHmac("sha1", authToken).update(data, "utf8").digest("base64");
}

/** Everdoer's Twilio inbound route, e.g. https://api.everdoer.com/api/twilio/sms/inbound — or null (off). */
export function everdoerSmsForwardUrl(): string | null {
  const raw = process.env.EVERDOER_SMS_FORWARD_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export type ForwardResult = { ok: true; status: number } | { ok: false; status?: number; error: string };

/**
 * POST Twilio's exact parameters to Everdoer, with an X-Twilio-Signature computed for that URL.
 * The signature covers every parameter, so they are forwarded as received (none added or
 * dropped). Never throws.
 */
export async function forwardTextToEverdoer(params: Record<string, string>, url = everdoerSmsForwardUrl()): Promise<ForwardResult> {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!url) return { ok: false, error: "forwarding is off" };
  if (!token) return { ok: false, error: "no TWILIO_AUTH_TOKEN to sign with" };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", "x-twilio-signature": signForTwilio(url, params, token) },
      body: new URLSearchParams(params).toString(),
      signal: AbortSignal.timeout(FORWARD_TIMEOUT_MS),
      cache: "no-store",
    });
    if (res.ok) return { ok: true, status: res.status };
    return { ok: false, status: res.status, error: `everdoer ${res.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
