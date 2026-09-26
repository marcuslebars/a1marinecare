import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { healthReport } from "@/lib/retell/health";

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

/** GET /api/retell/health — is Marina wired up? Env vars, Retell agent/number/webhooks, outbound queue. */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const report = await healthReport();
  return NextResponse.json(report, { status: report.ok ? 200 : 503 });
}
