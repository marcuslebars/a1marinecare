import { NextResponse } from "next/server";
import { after } from "next/server";

import { sendAbandonedCallText, sendPostCallQuote } from "@/lib/retell/followups";
import { forwardToEmpireVu, notifyOwner, recordCall, verifyRetellSignature, type RetellWebhookEvent } from "@/lib/retell/webhook";

export const runtime = "nodejs";

/**
 * POST /api/retell/webhook — the Care agent's webhook URL in Retell.
 * Verifies Retell's signature, ACKs immediately, then (after the response)
 * texts the owner and forwards the untouched request to EmpireVu.
 */
export async function POST(request: Request) {
  const apiKey = process.env.RETELL_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });

  const rawBody = await request.text();
  const signature = request.headers.get("x-retell-signature");
  if (!verifyRetellSignature(rawBody, signature, apiKey)) {
    return NextResponse.json({ ok: false, reason: "bad_signature" }, { status: 401 });
  }

  let evt: RetellWebhookEvent;
  try {
    evt = JSON.parse(rawBody) as RetellWebhookEvent;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }
  if (!evt || typeof evt.event !== "string") return NextResponse.json({ ok: false, reason: "invalid_event" }, { status: 400 });

  console.log("[Retell webhook]", evt.event, evt.call?.call_id ?? "", evt.call?.from_number ?? "");

  after(async () => {
    await recordCall(evt); // first: the customer texts below stamp this row
    const inboundDone = evt.event === "call_analyzed" && evt.call?.direction !== "outbound";
    await Promise.allSettled([
      notifyOwner(evt),
      forwardToEmpireVu(rawBody, signature),
      inboundDone ? sendPostCallQuote(evt.call?.call_id) : Promise.resolve(),
      inboundDone ? sendAbandonedCallText(evt) : Promise.resolve(),
    ]);
  });

  return NextResponse.json({ ok: true });
}
