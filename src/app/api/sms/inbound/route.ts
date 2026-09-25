import { NextResponse } from "next/server";
import { after } from "next/server";

import { candidateUrls, handleInboundSms, verifyTwilioSignature } from "@/lib/retell/inbound-sms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

/**
 * POST /api/sms/inbound — the Twilio number's "A message comes in" webhook.
 * Verifies X-Twilio-Signature, answers with empty TwiML at once (so Twilio
 * sends nothing on its own), then relays the text to Marcus and acks the customer.
 */
export async function POST(request: Request) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });

  const form = await request.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") params[k] = v;

  const url = new URL(request.url);
  if (!verifyTwilioSignature(candidateUrls(request.url, url.pathname), params, request.headers.get("x-twilio-signature"), token)) {
    return NextResponse.json({ ok: false, reason: "bad_signature" }, { status: 401 });
  }

  console.log("[inbound sms] received", { from: params.From ? params.From.slice(-4) : "?", sid: params.MessageSid ?? "" });
  after(async () => {
    try {
      await handleInboundSms(params);
    } catch (err) {
      console.error("[inbound sms] failed:", err instanceof Error ? err.message : String(err));
    }
  });

  return new NextResponse(EMPTY_TWIML, { status: 200, headers: { "content-type": "text/xml" } });
}
