import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { runFollowups } from "@/lib/retell/followups";
import { runOutboundQueue } from "@/lib/retell/outbound";

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
  const now = new Date();
  const [texts, calls] = await Promise.all([runFollowups(now, { dryRun: true }), runOutboundQueue(now, { dryRun: true })]);
  return NextResponse.json({ ok: true, dryRun: true, ...texts, called: calls.called, skipped: [...texts.skipped, ...calls.skipped] });
}

/** POST — send the nudges and reminders that are due. Called hourly by the follow-ups workflow. */
export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false }, { status: 401 });
  const now = new Date();
  const result = await runFollowups(now);
  const calls = await runOutboundQueue(now);
  console.log("[followups]", `nudged=${result.nudged.length}`, `pickDate=${result.pickDate.length}`, `reminded=${result.reminded.length}`, `called=${calls.called.length}`, [...result.skipped, ...calls.skipped].join("; "));
  return NextResponse.json({ ok: true, ...result, called: calls.called, skipped: [...result.skipped, ...calls.skipped] });
}
