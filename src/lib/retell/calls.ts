import { prettyPhone } from "./auth";
import { lookupCallerByPhone } from "./caller-lookup";
import { outboundCallMissed } from "./outbound";
import { lookupCallOutcome } from "./webhook";

// Pulls Marina's recent calls from Retell and joins them with what our own
// database says happened on each (quote / booking / deposit), so a weekly
// transcript review is one GET instead of clicking through the Retell UI.

// Retell removed the legacy list endpoints (incl. POST /v2/list-calls). The
// replacement, POST /v3/list-calls, pages its results ({ items, has_more,
// pagination_key }) and leaves transcripts out, so each call's transcript comes
// from GET /v2/get-call/{call_id}.
const RETELL = "https://api.retellai.com";
const RETELL_LIST_CALLS = `${RETELL}/v3/list-calls`;
const PAGE_SIZE = 100;
const TRANSCRIPT_CONCURRENCY = 6;

export type RetellCall = {
  call_id: string;
  call_type?: string;
  agent_id?: string;
  direction?: string;
  from_number?: string;
  to_number?: string;
  call_status?: string;
  start_timestamp?: number;
  end_timestamp?: number;
  duration_ms?: number;
  disconnection_reason?: string;
  transcript?: string;
  call_analysis?: {
    call_summary?: string;
    user_sentiment?: string;
    call_successful?: boolean;
    in_voicemail?: boolean;
    custom_analysis_data?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
  retell_llm_dynamic_variables?: Record<string, string>;
};

export type CallReview = {
  id: string;
  when: string;
  direction: string;
  number: string;
  duration: string;
  ended: string;
  missed: "no answer" | "voicemail" | null;
  sentiment: string;
  successful: boolean | null;
  summary: string;
  analysis: Record<string, unknown>;
  outcome: { name: string | null; boat: string | null; quoted: number | null; booked: string | null; depositPaid: boolean };
  reason: string;
  transcript: string;
};

export type CallReviewStats = {
  calls: number;
  inbound: number;
  outbound: number;
  outboundMissed: number;
  avgSeconds: number;
  quoted: number;
  booked: number;
  depositPaid: number;
  transferred: number;
  under30s: number;
  endedBy: Record<string, number>;
  sentiment: Record<string, number>;
};

function torontoStamp(ms: number | undefined): string {
  if (!ms) return "";
  return new Date(ms).toLocaleString("en-CA", { timeZone: "America/Toronto", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function duration(ms: number | undefined): string {
  if (!ms) return "0s";
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${String(s % 60).padStart(2, "0")}s`;
}

type ListCallsPage = { items?: RetellCall[]; has_more?: boolean; pagination_key?: string };

/** The v3 list-calls request body for one page. Exported for tests. */
export function listCallsBody(opts: { agentId?: string; sinceMs: number; limit: number; paginationKey?: string }) {
  return {
    filter_criteria: {
      ...(opts.agentId ? { agent: [{ agent_id: opts.agentId }] } : {}),
      start_timestamp: { type: "number", op: "ge", value: opts.sinceMs },
    },
    sort_order: "descending",
    limit: opts.limit,
    ...(opts.paginationKey ? { pagination_key: opts.paginationKey } : {}),
  };
}

async function listCalls(apiKey: string, agentId: string | undefined, sinceMs: number, limit: number): Promise<RetellCall[]> {
  const calls: RetellCall[] = [];
  let paginationKey: string | undefined;
  while (calls.length < limit) {
    const res = await fetch(RETELL_LIST_CALLS, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify(listCallsBody({ agentId, sinceMs, limit: Math.min(PAGE_SIZE, limit - calls.length), paginationKey })),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`retell list-calls ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
    const page = (await res.json()) as ListCallsPage;
    calls.push(...(page.items ?? []));
    if (!page.has_more || !page.pagination_key || !(page.items ?? []).length) break;
    paginationKey = page.pagination_key;
  }
  return calls.slice(0, limit);
}

/** The list leaves transcripts out; fetch each one. A failed fetch keeps the call, without its transcript. */
async function withTranscripts(apiKey: string, calls: RetellCall[]): Promise<RetellCall[]> {
  const out = [...calls];
  let next = 0;
  const worker = async () => {
    while (next < out.length) {
      const i = next++;
      const c = out[i];
      try {
        const res = await fetch(`${RETELL}/v2/get-call/${encodeURIComponent(c.call_id)}`, {
          headers: { authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(10_000),
          cache: "no-store",
        });
        if (!res.ok) continue;
        const full = (await res.json()) as Partial<RetellCall>;
        if (typeof full.transcript === "string") out[i] = { ...c, transcript: full.transcript };
      } catch {
        /* keep the call without its transcript */
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(TRANSCRIPT_CONCURRENCY, out.length) }, worker));
  return out;
}

export async function fetchRecentCalls(days: number, limit: number): Promise<RetellCall[]> {
  const apiKey = process.env.RETELL_API_KEY?.trim();
  if (!apiKey) throw new Error("RETELL_API_KEY not set");
  const agentId = process.env.RETELL_AGENT_ID?.trim() || undefined;
  const calls = await listCalls(apiKey, agentId, Date.now() - days * 86_400_000, limit);
  return withTranscripts(apiKey, calls);
}

export async function reviewCall(c: RetellCall, opts: { full: boolean }): Promise<CallReview> {
  const outbound = c.direction === "outbound";
  const transcript = c.transcript ?? "";
  let outcome = await lookupCallOutcome(c.call_id);
  if (!outcome.name && !outcome.boat) {
    // The call didn't create the quote (web lead, returning caller) — what do we know about the number?
    const p = await lookupCallerByPhone(outbound ? c.to_number : c.from_number, c.start_timestamp ? new Date(c.start_timestamp) : new Date());
    if (p.known) outcome = { name: p.fullName || null, boat: p.boat || null, quotedCents: null, bookingLabel: p.bookedWindow || null, depositPaid: p.depositPaid };
  }
  return {
    id: c.call_id,
    when: torontoStamp(c.start_timestamp),
    direction: c.direction ?? "?",
    number: prettyPhone(outbound ? c.to_number : c.from_number),
    duration: duration(c.duration_ms),
    ended: c.disconnection_reason ?? "?",
    missed: outbound ? outboundCallMissed(c) : null,
    sentiment: c.call_analysis?.user_sentiment ?? "",
    successful: c.call_analysis?.call_successful ?? null,
    summary: c.call_analysis?.call_summary ?? "",
    analysis: c.call_analysis?.custom_analysis_data ?? {},
    outcome: { name: outcome.name, boat: outcome.boat, quoted: outcome.quotedCents, booked: outcome.bookingLabel, depositPaid: outcome.depositPaid },
    reason: c.retell_llm_dynamic_variables?.outbound_reason ?? "",
    transcript: opts.full ? transcript : transcript.length > 600 ? `${transcript.slice(0, 597)}…` : transcript,
  };
}

export function summarize(reviews: CallReview[], raw: RetellCall[]): CallReviewStats {
  const stats: CallReviewStats = { calls: reviews.length, inbound: 0, outbound: 0, outboundMissed: 0, avgSeconds: 0, quoted: 0, booked: 0, depositPaid: 0, transferred: 0, under30s: 0, endedBy: {}, sentiment: {} };
  let totalMs = 0;
  reviews.forEach((r, i) => {
    if (r.direction === "outbound") stats.outbound++;
    else stats.inbound++;
    if (r.missed) stats.outboundMissed++;
    if (r.outcome.quoted != null) stats.quoted++;
    if (r.outcome.booked) stats.booked++;
    if (r.outcome.depositPaid) stats.depositPaid++;
    if (r.ended.includes("transfer")) stats.transferred++;
    const ms = raw[i]?.duration_ms ?? 0;
    totalMs += ms;
    if (ms && ms < 30_000) stats.under30s++;
    stats.endedBy[r.ended] = (stats.endedBy[r.ended] ?? 0) + 1;
    if (r.sentiment) stats.sentiment[r.sentiment] = (stats.sentiment[r.sentiment] ?? 0) + 1;
  });
  stats.avgSeconds = reviews.length ? Math.round(totalMs / reviews.length / 1000) : 0;
  return stats;
}
