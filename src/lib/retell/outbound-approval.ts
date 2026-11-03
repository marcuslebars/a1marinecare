import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { isMissingTableError } from "@/lib/lead-events";

import { prettyPhone } from "./auth";
import { lookupCallerByPhone } from "./caller-lookup";
import { isSmsConfigured, sendSms } from "./deposit-link";
import { inWindow } from "./followups";
import { addDays } from "./slots";
import type { OutboundReason } from "./outbound";
import { ownerSmsNumber } from "./webhook";

// Owner approval for speed-to-lead calls: a web lead (shrink-wrap quote or
// contact form) no longer gets Marina's call on its own. The queue row waits as
// "awaiting_approval", Marcus gets a text with who it is and what they asked
// for, and his reply decides it:
//
//   "Y 12" → queued, and Marina calls now (or at 9:00 if it's outside 9am–8pm)
//   "N 12" → skipped
//   no reply within 24 h → skipped
//
// The number is required: the owner gets other texts from this line (customer
// relays, call notices, "Calling Chris now."), so a bare "ok" or "no" never
// decides a lead. A code isn't reused for 7 days, so a late reply to an old text
// can't land on a newer lead.
//
// A customer who texted back asking for a call (reason "sms-reply") is still
// called straight away: they asked for it, and any web lead of theirs still
// waiting is dropped (dropWaitingFor). OUTBOUND_OWNER_APPROVAL=0 turns the
// approval step off; without OWNER_SMS_NUMBER there is nobody to ask, so calls
// go out on their own as before (likewise when Twilio sending isn't configured).
//
// ./outbound is imported lazily where its values are needed, so this module can
// load without it (it imports this file).

export const AWAITING_APPROVAL = "awaiting_approval";
/** Approval texts go out 8:00–21:00 Toronto; one that comes in overnight waits for the 8:00 run. */
export const APPROVAL_TEXT_HOURS: [number, number] = [8, 21];
/** A lead Marcus hasn't answered about in this long is dropped (never called). */
export const APPROVAL_EXPIRY_HOURS = 24;
/** A code isn't handed out again for this long. */
export const CODE_REUSE_DAYS = 7;

type QueueRow = { id: string; phone: string; customerName: string; createdAt: Date; metadata: Prisma.JsonValue };

function meta(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** Does a call for this reason wait for Marcus's OK? */
export function needsOwnerApproval(reason: OutboundReason): boolean {
  if (reason === "sms-reply") return false;
  const flag = process.env.OUTBOUND_OWNER_APPROVAL?.trim().toLowerCase();
  if (flag === "0" || flag === "off" || flag === "false" || flag === "no") return false;
  return Boolean(ownerSmsNumber()) && isSmsConfigured();
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

export type OwnerDecision = { approved: boolean; code: number | null };

const YES_WORDS = new Set(["y", "yes", "yep", "yeah", "yup", "ok", "okay", "sure", "call", "approve", "approved", "go"]);
const NO_WORDS = new Set(["n", "no", "nope", "nah", "skip", "pass"]);

/**
 * Marcus's reply → a decision, or null when it isn't one. Only a bare word with an
 * optional code counts ("Y 12", "yes 12", "N #12", "call 12."), so a sentence that
 * happens to start with "ok" or "no" is never read as an answer. A decision without
 * a code doesn't decide anything (handleOwnerReply asks for the number).
 */
export function parseOwnerDecision(body: string | null | undefined): OwnerDecision | null {
  const m = /^\s*([a-z]+)\s*#?\s*(\d{1,3})?\s*[.!]*\s*$/i.exec(body ?? "");
  if (!m) return null;
  const word = m[1].toLowerCase();
  const code = m[2] ? Number.parseInt(m[2], 10) : null;
  if (YES_WORDS.has(word)) return { approved: true, code };
  if (NO_WORDS.has(word)) return { approved: false, code };
  return null;
}

/** A code 10–99 not used by any lead still waiting (100+ only if all are taken). */
export function pickApprovalCode(taken: Iterable<number>, random: () => number = Math.random): number {
  const used = new Set(taken);
  const free: number[] = [];
  for (let c = 10; c <= 99; c++) if (!used.has(c)) free.push(c);
  if (free.length > 0) return free[Math.floor(random() * free.length) % free.length];
  let c = 100;
  while (used.has(c)) c++;
  return c;
}

/** The text Marcus gets about a new lead. */
export function approvalRequestText(input: {
  code: number;
  name: string;
  phone: string;
  reason: OutboundReason;
  boat?: string;
  total?: string;
  detail?: string | null;
}): string {
  const name = clip(input.name, 60);
  const who = name ? `${name}, ${prettyPhone(input.phone)}` : prettyPhone(input.phone);
  let what: string;
  if (input.reason === "shrink-wrap-quote") {
    what = `Shrink wrap quote${input.boat ? ` for a ${input.boat}` : ""}${input.total ? `: ${input.total} + tax` : ""}.`;
  } else {
    what = input.detail?.trim() ? `Contact form: ${clip(input.detail, 180)}` : "Contact form.";
  }
  return `📞 #${input.code} New lead: ${who}. ${what}\nHave Marina call them? Reply Y ${input.code} to call or N ${input.code} to skip.`;
}

/** "at 9:00 am today" / "at 9:00 am tomorrow", for a call that waits for calling hours. */
export function callTimeLabel(dueAt: Date, now: Date): string {
  const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: "America/Toronto", hour: "numeric", minute: "2-digit" }).format(dueAt).toLowerCase();
  const today = day(now);
  const when = day(dueAt) === today ? "today" : day(dueAt) === addDays(today, 1) ? "tomorrow" : `on ${day(dueAt)}`;
  return `at ${time} ${when}`;
}

function whoOf(row: Pick<QueueRow, "customerName" | "phone">): string {
  const name = row.customerName?.trim();
  return name && !/^unknown/i.test(name) ? name.split(/\s+/)[0] : prettyPhone(row.phone);
}

// ── Rows ──────────────────────────────────────────────────────────────────────

async function leadType(): Promise<string> {
  return (await import("./outbound")).OUTBOUND_LEAD_TYPE;
}

/** Leads waiting for Marcus (created in the last 3 days), oldest first. */
async function awaitingRows(now: Date): Promise<QueueRow[]> {
  return prisma.leadEvent.findMany({
    where: { leadType: await leadType(), createdAt: { gte: new Date(now.getTime() - 3 * 86_400_000) }, metadata: { path: ["status"], equals: AWAITING_APPROVAL } },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: { id: true, phone: true, customerName: true, createdAt: true, metadata: true },
  });
}

/** Codes handed out in the last CODE_REUSE_DAYS, answered or not (for pickApprovalCode). */
export async function takenApprovalCodes(now: Date): Promise<number[]> {
  const rows = await prisma.leadEvent.findMany({
    where: { leadType: await leadType(), createdAt: { gte: new Date(now.getTime() - CODE_REUSE_DAYS * 86_400_000) } },
    select: { metadata: true },
    take: 500,
  });
  return rows.map((r) => meta(r.metadata).approvalCode).filter((c): c is number => typeof c === "number");
}

/** How many leads are waiting for Marcus (the follow-ups dry run reports it). */
export async function waitingCount(now = new Date()): Promise<number> {
  return (await awaitingRows(now)).filter((r) => !isExpired(r, now)).length;
}

/**
 * The customer asked for a call themselves (a text back): drop any web lead of
 * theirs still waiting for Marcus, so his later Y can't call them a second time.
 */
export async function dropWaitingFor(phone: string, now = new Date()): Promise<number> {
  let dropped = 0;
  try {
    for (const row of await awaitingRows(now)) {
      if (row.phone !== phone) continue;
      if (await claim(row, { status: "skipped", skipReason: "they texted asking for a call", skippedAt: now.toISOString() })) dropped += 1;
    }
  } catch (err) {
    if (!isMissingTableError(err)) console.error("[outbound approval] drop failed:", err instanceof Error ? err.message : String(err));
  }
  return dropped;
}

/**
 * Move a row out of awaiting_approval, merging `patch` into its metadata. The
 * status is checked in the update itself, so a double "Y" (or the expiry sweep
 * racing a reply) changes it only once. False if it had already moved on.
 */
async function claim(row: QueueRow, patch: Record<string, unknown>): Promise<boolean> {
  const { count } = await prisma.leadEvent.updateMany({
    where: { id: row.id, metadata: { path: ["status"], equals: AWAITING_APPROVAL } },
    data: { metadata: { ...meta(row.metadata), ...patch } as Prisma.InputJsonValue },
  });
  return count > 0;
}

function isExpired(row: Pick<QueueRow, "createdAt">, now: Date): boolean {
  return now.getTime() - row.createdAt.getTime() >= APPROVAL_EXPIRY_HOURS * 3_600_000;
}

/**
 * Text Marcus about one waiting lead (once; outside 8:00–21:00 it waits for the
 * hourly run). Never throws.
 */
export async function sendApprovalRequest(id: string, now = new Date()): Promise<boolean> {
  const owner = ownerSmsNumber();
  if (!owner || !inWindow(now, APPROVAL_TEXT_HOURS)) return false;
  try {
    const row = await prisma.leadEvent.findUnique({ where: { id }, select: { id: true, phone: true, customerName: true, createdAt: true, metadata: true } });
    if (!row) return false;
    const m = meta(row.metadata);
    if (m.status !== AWAITING_APPROVAL || typeof m.approvalTextAt === "string" || typeof m.approvalCode !== "number" || isExpired(row, now)) return false;
    const profile = await lookupCallerByPhone(row.phone, now);
    const body = approvalRequestText({
      code: m.approvalCode,
      name: profile.fullName || (/^unknown/i.test(row.customerName) ? "" : row.customerName),
      phone: row.phone,
      reason: (m.reason as OutboundReason) || "contact",
      boat: profile.boat || undefined,
      total: profile.quoteTotal || undefined,
      detail: typeof m.detail === "string" ? m.detail : null,
    });
    const sms = await sendSms(owner, body);
    if (!sms.ok) {
      console.error("[outbound approval] text to owner failed:", sms.error);
      return false;
    }
    // Record the send only while it's still waiting (never write over a decision made meanwhile).
    const fresh = await prisma.leadEvent.findUnique({ where: { id }, select: { metadata: true } });
    await prisma.leadEvent.updateMany({
      where: { id, metadata: { path: ["status"], equals: AWAITING_APPROVAL } },
      data: { metadata: { ...meta(fresh?.metadata ?? row.metadata), approvalTextAt: now.toISOString() } as Prisma.InputJsonValue },
    });
    return true;
  } catch (err) {
    if (!isMissingTableError(err)) console.error("[outbound approval] request failed:", err instanceof Error ? err.message : String(err));
    return false;
  }
}

/**
 * Hourly (runOutboundQueue): drop leads Marcus never answered about, and send any
 * approval text that didn't go out (overnight lead, failed send). Never throws.
 */
export async function sweepApprovals(now = new Date()): Promise<{ expired: number; texted: number }> {
  const out = { expired: 0, texted: 0 };
  if (!process.env.DATABASE_URL) return out;
  try {
    for (const row of await awaitingRows(now)) {
      if (isExpired(row, now)) {
        if (await claim(row, { status: "skipped", skipReason: "no reply from Marcus", skippedAt: now.toISOString() })) out.expired += 1;
      } else if (typeof meta(row.metadata).approvalTextAt !== "string") {
        if (await sendApprovalRequest(row.id, now)) out.texted += 1;
      }
    }
  } catch (err) {
    if (!isMissingTableError(err)) console.error("[outbound approval] sweep failed:", err instanceof Error ? err.message : String(err));
  }
  return out;
}

export type OwnerReplyResult = { handled: boolean; reply?: string };

/**
 * A text from Marcus to the Twilio line. If it's a Y/N answer, decide the lead it
 * points at and return what to text back; anything else isn't ours (handled:false).
 */
/** Starts like a yes/no to us but has no usable number ("Y", "yes call him", "N34 Y35"). */
const ATTEMPT_RE = /^\s*(y|yes|yep|yeah|n|no|nope)\b|^\s*[yn]\d/i;

export async function handleOwnerReply(body: string, now = new Date()): Promise<OwnerReplyResult> {
  if (!process.env.DATABASE_URL) return { handled: false };
  const decision = parseOwnerDecision(body);
  const attempt = ATTEMPT_RE.test(body ?? "");
  if (!decision?.code && !attempt) return { handled: false };
  try {
    const waiting = (await awaitingRows(now)).filter((r) => !isExpired(r, now));
    if (decision?.code == null) {
      // No number: never guess which lead. Say how to answer, if anything is waiting.
      if (waiting.length === 0) return { handled: false };
      const list = waiting.slice(0, 5).map((r) => `#${String(meta(r.metadata).approvalCode ?? "?")} ${whoOf(r)}`).join(" · ");
      const first = meta(waiting[0].metadata).approvalCode;
      return { handled: true, reply: `Waiting for your OK: ${list}. Reply Y or N with the number${typeof first === "number" ? `, like Y ${first}` : ""}.` };
    }
    const row = waiting.find((r) => meta(r.metadata).approvalCode === decision.code);
    if (!row) return { handled: true, reply: `#${decision.code} isn't waiting any more - it was already answered or it expired.` };

    const who = whoOf(row);
    const decided = { decidedAt: now.toISOString() };
    if (!decision.approved) {
      const ok = await claim(row, { ...decided, status: "skipped", skipReason: "Marcus said no" });
      return { handled: true, reply: ok ? `OK - Marina won't call ${who}.` : `#${decision.code} was already answered.` };
    }

    const outbound = await import("./outbound");
    const callNow = inWindow(now, outbound.CALL_HOURS);
    const dueAt = callNow ? now : outbound.scheduleFor(now, 0);
    const ok = await claim(row, { ...decided, status: "queued", approvedAt: now.toISOString(), dueAt: dueAt.toISOString() });
    if (!ok) return { handled: true, reply: `#${decision.code} was already answered.` };

    if (!callNow) {
      outbound.armCallTimer(row.id, dueAt, now);
      return { handled: true, reply: `OK - Marina will call ${who} ${callTimeLabel(dueAt, now)} (calls go out 9am-8pm).` };
    }
    const placed = await outbound.placeQueuedCall(row.id, now);
    return { handled: true, reply: placed.placed ? `Calling ${who} now.` : `Didn't call ${who}: ${placed.reason ?? "the call couldn't be placed"}.` };
  } catch (err) {
    if (!isMissingTableError(err)) console.error("[outbound approval] reply failed:", err instanceof Error ? err.message : String(err));
    return { handled: true, reply: "Something went wrong with that - check the logs." };
  }
}
