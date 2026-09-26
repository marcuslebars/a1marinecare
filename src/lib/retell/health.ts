import { company } from "@/content/site";
import { prisma } from "@/lib/db/prisma";
import { isMissingTableError } from "@/lib/lead-events";

import { OUTBOUND_LEAD_TYPE, isOutboundConfigured } from "./outbound";

// Is Marina actually wired up right now? Catches the things that fail quietly:
// an agent edited but not published, a number still bound to an old version,
// a webhook pointing somewhere else, a missing env var, a stuck outbound queue.
// Read by GET /api/retell/health and folded into the 7am digest as ⚠️ lines.

export type HealthCheck = { name: string; ok: boolean; detail: string };
export type HealthReport = { ok: boolean; checks: HealthCheck[]; warnings: string[] };

type RetellAgent = { agent_id?: string; version?: number; is_published?: boolean; webhook_url?: string; agent_name?: string; response_engine?: { llm_id?: string; version?: number } };
type RetellNumber = {
  phone_number?: string;
  inbound_agents?: Array<{ agent_id?: string; agent_version?: number }>;
  outbound_agents?: Array<{ agent_id?: string; agent_version?: number }>;
  inbound_webhook_url?: string;
  allowed_outbound_country_list?: string[];
};

const RETELL = "https://api.retellai.com";

async function retellGet<T>(path: string, apiKey: string): Promise<T | { error: string }> {
  try {
    const res = await fetch(`${RETELL}${path}`, { headers: { authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!res.ok) return { error: `${res.status} ${(await res.text().catch(() => "")).slice(0, 120)}` };
    return (await res.json()) as T;
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

function sameHost(a: string | undefined, b: string): boolean {
  try {
    const ua = new URL(a ?? "");
    const ub = new URL(b);
    return ua.host.replace(/^www\./, "") === ub.host.replace(/^www\./, "") && ua.pathname === ub.pathname;
  } catch {
    return false;
  }
}

export async function checkEnv(): Promise<HealthCheck[]> {
  const need: Array<[string, string]> = [
    ["RETELL_API_KEY", "Retell webhook signature + call review"],
    ["RETELL_FUNCTION_SECRET", "Marina's four tools"],
    ["TWILIO_ACCOUNT_SID", "customer texts"],
    ["TWILIO_AUTH_TOKEN", "customer texts + inbound SMS"],
    ["TWILIO_FROM_NUMBER", "customer texts"],
    ["OWNER_SMS_NUMBER", "your texts"],
    ["STRIPE_SECRET_KEY", "deposit links"],
    ["STRIPE_WEBHOOK_SECRET", "deposit paid events"],
    ["RESEND_API_KEY", "quote emails"],
    ["DIGEST_CRON_SECRET", "digest + follow-ups + calls"],
    ["DATABASE_URL", "everything"],
  ];
  const checks = need.map(([k, why]) => ({ name: `env ${k}`, ok: Boolean(process.env[k]?.trim()), detail: process.env[k]?.trim() ? "set" : `missing — needed for ${why}` }));
  checks.push({ name: "outbound calls", ok: true, detail: isOutboundConfigured() ? "on (RETELL_AGENT_ID + RETELL_FROM_NUMBER set)" : "off — RETELL_AGENT_ID / RETELL_FROM_NUMBER not set" });
  return checks;
}

export async function checkRetell(): Promise<HealthCheck[]> {
  const apiKey = process.env.RETELL_API_KEY?.trim();
  const agentId = process.env.RETELL_AGENT_ID?.trim();
  const number = process.env.RETELL_FROM_NUMBER?.trim();
  const out: HealthCheck[] = [];
  if (!apiKey || !agentId) return [{ name: "retell", ok: false, detail: "RETELL_API_KEY / RETELL_AGENT_ID not set — can't inspect the agent" }];

  const agent = await retellGet<RetellAgent>(`/get-agent/${encodeURIComponent(agentId)}`, apiKey);
  if ("error" in agent) return [{ name: "retell agent", ok: false, detail: `couldn't load agent: ${agent.error}` }];
  const latest = agent.version ?? 0;
  out.push({ name: "agent published", ok: agent.is_published !== false, detail: agent.is_published === false ? `v${latest} has unpublished changes — callers get the previous version` : `v${latest} published` });
  const wantWebhook = `${company.url}/api/retell/webhook`;
  out.push({ name: "agent webhook", ok: sameHost(agent.webhook_url, wantWebhook), detail: agent.webhook_url ? agent.webhook_url : "not set — no owner texts, no post-call texts" });

  if (number) {
    const num = await retellGet<RetellNumber>(`/get-phone-number/${encodeURIComponent(number)}`, apiKey);
    if ("error" in num) {
      out.push({ name: "phone number", ok: false, detail: `couldn't load ${number}: ${num.error}` });
    } else {
      const publishedVersion = agent.is_published === false ? latest - 1 : latest;
      for (const dir of ["inbound", "outbound"] as const) {
        const binds = (dir === "inbound" ? num.inbound_agents : num.outbound_agents) ?? [];
        const mine = binds.find((b) => b.agent_id === agentId);
        if (!mine) out.push({ name: `${dir} agent`, ok: false, detail: `${number} ${dir} is not bound to the Care agent` });
        else if (mine.agent_version != null && mine.agent_version < publishedVersion) out.push({ name: `${dir} agent`, ok: false, detail: `${number} ${dir} is on v${mine.agent_version}; published is v${publishedVersion} — re-publish and update the number` });
        else out.push({ name: `${dir} agent`, ok: true, detail: `${number} → Care agent v${mine.agent_version ?? "latest"}` });
      }
      const wantInbound = `${company.url}/api/retell/inbound`;
      out.push({ name: "inbound webhook", ok: sameHost(num.inbound_webhook_url, wantInbound), detail: num.inbound_webhook_url ?? "not set — returning callers won't be recognised" });
      if (num.allowed_outbound_country_list && !num.allowed_outbound_country_list.includes("CA")) out.push({ name: "outbound countries", ok: false, detail: `CA not allowed (${num.allowed_outbound_country_list.join(",")})` });
    }
  }
  return out;
}

export async function checkQueue(now = new Date()): Promise<HealthCheck[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const rows = await prisma.leadEvent.findMany({
      where: { leadType: OUTBOUND_LEAD_TYPE, createdAt: { gte: new Date(now.getTime() - 3 * 86_400_000) } },
      select: { id: true, phone: true, metadata: true, createdAt: true },
    });
    const meta = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
    const stuck = rows.filter((r) => {
      const m = meta(r.metadata);
      return m.status === "queued" && typeof m.dueAt === "string" && now.getTime() - new Date(m.dueAt).getTime() > 3 * 3600_000;
    });
    const failed = rows.filter((r) => meta(r.metadata).status === "failed" && now.getTime() - r.createdAt.getTime() < 86_400_000);
    const out: HealthCheck[] = [];
    out.push({ name: "outbound queue", ok: stuck.length === 0, detail: stuck.length ? `${stuck.length} call${stuck.length === 1 ? "" : "s"} queued 3h+ past due — is the hourly workflow running?` : `${rows.filter((r) => meta(r.metadata).status === "queued").length} queued, nothing overdue` });
    if (failed.length) out.push({ name: "outbound failures", ok: false, detail: failed.map((r) => `${r.phone}: ${String(meta(r.metadata).error ?? "?").slice(0, 80)}`).join(" | ") });
    return out;
  } catch (err) {
    if (isMissingTableError(err)) return [];
    return [{ name: "outbound queue", ok: false, detail: err instanceof Error ? err.message : String(err) }];
  }
}

export async function healthReport(now = new Date()): Promise<HealthReport> {
  const [env, retell, queue] = await Promise.all([checkEnv(), checkRetell(), checkQueue(now)]);
  const checks = [...env, ...retell, ...queue];
  const warnings = checks.filter((c) => !c.ok).map((c) => `${c.name}: ${c.detail}`);
  return { ok: warnings.length === 0, checks, warnings };
}
