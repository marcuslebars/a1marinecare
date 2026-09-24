import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { buildDigest, sendDigest } from "@/lib/retell/digest";

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

/** GET /api/retell/digest — preview yesterday's digest without sending. */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const digest = await buildDigest();
  return NextResponse.json({ ok: true, digest });
}

/** POST /api/retell/digest — build and text it to OWNER_SMS_NUMBER. Called by the scheduled workflow at 7am Toronto. */
export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const result = await sendDigest();
  console.log("[digest]", result.sent ? "sent" : "not sent", result.error ?? "", result.digest.forDate);
  return NextResponse.json({ ok: result.sent, error: result.error, digest: result.digest }, { status: result.sent ? 200 : 502 });
}
