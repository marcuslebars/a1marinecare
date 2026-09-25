import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { fetchRecentCalls, reviewCall, summarize } from "@/lib/retell/calls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const expected = process.env.DIGEST_CRON_SECRET?.trim();
  const provided = request.headers.get("x-a1-cron-secret")?.trim();
  if (!expected || !provided) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * GET /api/retell/calls?days=7&limit=50&full=1 — Marina's recent calls with
 * transcript + analysis from Retell, joined with our own quote / booking /
 * deposit records. For the weekly transcript review. Same secret as the digest.
 */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const url = new URL(request.url);
  const days = Math.min(Math.max(Number(url.searchParams.get("days")) || 7, 1), 90);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 50, 1), 200);
  const full = url.searchParams.get("full") === "1";
  try {
    const raw = await fetchRecentCalls(days, limit);
    const calls = await Promise.all(raw.map((c) => reviewCall(c, { full })));
    return NextResponse.json({ ok: true, days, stats: summarize(calls, raw), calls });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[calls] review failed:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
