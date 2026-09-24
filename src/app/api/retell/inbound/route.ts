import { NextResponse } from "next/server";

import { lookupCallerByPhone, toDynamicVariables, UNKNOWN_CALLER } from "@/lib/retell/caller-lookup";
import { verifyRetellSignature } from "@/lib/retell/webhook";

export const runtime = "nodejs";

const BUDGET_MS = 1500;

type InboundBody = { event?: string; call_inbound?: { call_id?: string; from_number?: string; to_number?: string; agent_id?: string } };

/**
 * POST /api/retell/inbound — Retell's inbound-call webhook, set on the phone
 * number. Runs while the phone is still ringing, so it is strictly
 * fail-open: any problem returns empty variables and the call connects.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const empty = NextResponse.json({ call_inbound: { dynamic_variables: toDynamicVariables(UNKNOWN_CALLER) } });

  const apiKey = process.env.RETELL_API_KEY?.trim();
  if (!apiKey || !verifyRetellSignature(rawBody, request.headers.get("x-retell-signature"), apiKey)) {
    console.warn("[Retell inbound] unsigned or bad signature — answering as unknown caller");
    return empty;
  }

  let body: InboundBody;
  try {
    body = JSON.parse(rawBody) as InboundBody;
  } catch {
    return empty;
  }
  const from = body.call_inbound?.from_number ?? null;

  const profile = await Promise.race([
    lookupCallerByPhone(from),
    new Promise<typeof UNKNOWN_CALLER>((resolve) => setTimeout(() => resolve(UNKNOWN_CALLER), BUDGET_MS)),
  ]).catch(() => UNKNOWN_CALLER);

  console.log("[Retell inbound]", from ?? "unknown", profile.known ? `known: ${profile.fullName} · ${profile.boat}` : "new caller");

  return NextResponse.json({
    call_inbound: {
      dynamic_variables: toDynamicVariables(profile),
      metadata: profile.known ? { quoteId: profile.quoteId } : {},
    },
  });
}
