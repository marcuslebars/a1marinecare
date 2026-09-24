import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { runFollowups } from "@/lib/retell/followups";

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

/** GET — dry run: who *would* be texted right now. */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, dryRun: true, ...(await runFollowups(new Date(), { dryRun: true })) });
}

/** POST — send the nudges and reminders that are due. Called hourly by the follow-ups workflow. */
export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const result = await runFollowups();
  console.log("[followups]", `nudged=${result.nudged.length}`, `reminded=${result.reminded.length}`, result.skipped.join("; "));
  return NextResponse.json({ ok: true, ...result });
}
