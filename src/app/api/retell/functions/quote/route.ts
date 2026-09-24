import { NextResponse } from "next/server";

import { normalizePhone, readRetellFunctionRequest } from "@/lib/retell/auth";
import { createPhoneShrinkWrapQuote, parseEngineType, parseHullType, parseLengthFt } from "@/lib/retell/phone-quote";

export const runtime = "nodejs";

type Args = {
  name?: string;
  phone?: string;
  email?: string;
  boat_length_ft?: number | string;
  hull_type?: string;
  winterization_engine?: string;
  engine_count?: number | string;
  boat_location?: string;
  town?: string;
  notes?: string;
};

/**
 * POST /api/retell/functions/quote — Marina's `quote_shrink_wrap` tool.
 * Prices with the same calculator as the website, files the lead through the
 * same pipeline, and returns a quote id + a sentence Marina can read aloud.
 */
export async function POST(request: Request) {
  const guard = await readRetellFunctionRequest<Args>(request);
  if (!guard.ok) return guard.response;
  const { args, call } = guard.data;

  const name = typeof args.name === "string" ? args.name.trim() : "";
  const lengthFt = parseLengthFt(args.boat_length_ft);
  const phone = normalizePhone(typeof args.phone === "string" ? args.phone : null) ?? normalizePhone(call.fromNumber);

  const missing: string[] = [];
  if (name.length < 2) missing.push("name");
  if (!lengthFt) missing.push("boat_length_ft");
  if (!phone) missing.push("phone");
  if (missing.length) {
    return NextResponse.json({ ok: false, reason: "missing_info", missing, say: `I still need the caller's ${missing.join(" and ").replace(/_/g, " ")} before I can price it.` });
  }

  const engineType = parseEngineType(args.winterization_engine);
  const engineCount = engineType ? (parseLengthFt(args.engine_count) ?? 1) : null;
  const email = typeof args.email === "string" && /\S+@\S+\.\S+/.test(args.email) ? args.email.trim() : null;

  try {
    const result = await createPhoneShrinkWrapQuote({
      contactName: name,
      contactPhone: phone!,
      contactEmail: email,
      lengthFt: lengthFt!,
      hullType: parseHullType(args.hull_type),
      engineType,
      engineCount,
      boatLocation: typeof args.boat_location === "string" ? args.boat_location.trim() : null,
      town: typeof args.town === "string" ? args.town.trim() : null,
      notes: typeof args.notes === "string" ? args.notes.trim() : null,
      retellCallId: call.callId,
    });

    return NextResponse.json({
      ok: true,
      quote_id: result.quoteId,
      total_dollars: Math.round(result.subtotalCents) / 100,
      deposit_dollars: 250,
      line_items: result.lineItems.map((i) => ({ label: i.label, dollars: Math.round(i.amountCents) / 100 })),
      requires_manual_review: result.requiresManualReview,
      say: result.spokenSummary,
    });
  } catch (err) {
    console.error("[Retell quote] failed:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: "error", say: "I hit a snag pricing that. Marcus will call back with the number within the hour." }, { status: 500 });
  }
}
