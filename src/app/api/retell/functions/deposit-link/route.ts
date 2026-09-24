import { NextResponse } from "next/server";

import { readRetellFunctionRequest } from "@/lib/retell/auth";
import { sendDepositLinkForQuote } from "@/lib/retell/deposit-link";

export const runtime = "nodejs";

type Args = { quote_id?: string; phone?: string; email?: string };

/**
 * POST /api/retell/functions/deposit-link — Marina's `send_deposit_link` tool.
 * Texts (and emails) the Stripe Checkout link for the $250 deposit.
 */
export async function POST(request: Request) {
  const guard = await readRetellFunctionRequest<Args>(request);
  if (!guard.ok) return guard.response;
  const { args, call } = guard.data;

  const quoteId = typeof args.quote_id === "string" ? args.quote_id.trim() : "";
  if (quoteId.length < 8) {
    return NextResponse.json({ ok: false, reason: "missing_info", missing: ["quote_id"], say: "I need to price the boat first, then I can send the deposit link." });
  }

  try {
    const result = await sendDepositLinkForQuote({
      quoteId,
      phoneOverride: typeof args.phone === "string" ? args.phone : null,
      emailOverride: typeof args.email === "string" && /\S+@\S+\.\S+/.test(args.email) ? args.email.trim() : null,
      retellCallId: call.callId,
    });
    if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason, say: result.say });

    const channels = result.sentBy.map((c) => (c === "sms" ? "text message" : "email"));
    const smsTail = result.sentTo.sms ? ` ending in ${result.sentTo.sms.slice(-4)}` : "";
    return NextResponse.json({
      ok: true,
      sent_by: result.sentBy,
      amount: result.amountLabel,
      expires_minutes: result.expiresMinutes,
      say: `I've just sent the ${result.amountLabel} deposit link by ${channels.join(" and ")}${result.sentBy.includes("sms") ? ` to the number${smsTail}` : ""}. It's good for the rest of the day, and the deposit comes straight off the final invoice.`,
    });
  } catch (err) {
    console.error("[Retell deposit-link] failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: "error", say: "The link didn't send. Marcus will text it to you directly and hold the spot." }, { status: 500 });
  }
}
