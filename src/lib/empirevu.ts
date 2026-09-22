/**
 * A1 Marine Care → EmpireVu dual-send.
 *
 * Additive: forwards the SAME lead to EmpireVu's canonical /api/intake in parallel
 * with the legacy-hub call in crm-webhook.ts. Best-effort — an EmpireVu outage costs
 * only EmpireVu's copy; the durable log + legacy hub are unaffected. Envelope shape is
 * the shared contract (LEAD_SCHEMA.md); the golden fixtures pin this builder's output.
 *
 * This also fixes the historical defect where Care quote/booking leads carried no
 * brand tag: sourceSite is always "a1marinecare" here.
 */
import { createHmac } from "node:crypto";

export interface LeadLineItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface LeadEnvelope {
  schemaVersion: 1;
  source: string;
  sourceSite: string;
  formType: "quote" | "contact" | "booking";
  receivedAt: string;
  contact: { name?: string; email?: string; phone?: string };
  message?: string;
  lineItems?: LeadLineItem[];
  asset?: { makeModel?: string; lengthFt?: number; type?: string; marina?: string };
  meta?: { site?: string; page?: string; preferredDate?: string; preferredTime?: string; utm?: Record<string, string> };
}

/** Superset of every Care lead payload (contact | quote | booking). */
export interface CareLeadInput {
  source: "contact" | "quote" | "booking";
  sourceSite?: string;
  leadTag?: string;
  name: string;
  email: string;
  phone?: string;
  service?: string;
  message?: string;
  notes?: string;
  boatLength?: string;
  boatType?: string;
  marina?: string;
  date?: string;
  timeSlot?: string;
  utm?: Record<string, string>;
}

function parseFeet(value?: string): number | undefined {
  if (!value) return undefined;
  const n = Number.parseFloat(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function compact<T extends Record<string, unknown>>(obj: T): T | undefined {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return Object.keys(out).length ? (out as T) : undefined;
}

function joinText(...parts: Array<string | undefined>): string | undefined {
  const text = parts.filter((p): p is string => Boolean(p && p.trim())).join("\n\n");
  return text || undefined;
}

export function buildCareEnvelope(input: CareLeadInput, receivedAt: string): LeadEnvelope {
  return {
    schemaVersion: 1,
    source: input.leadTag ?? `a1marinecare-${input.source}`,
    sourceSite: "a1marinecare",
    formType: input.source,
    receivedAt,
    contact: { name: input.name, email: input.email, phone: input.phone },
    message: joinText(input.service ? `Service: ${input.service}` : undefined, input.message, input.notes),
    asset: compact({ type: input.boatType, lengthFt: parseFeet(input.boatLength), marina: input.marina }),
    meta: compact({
      site: "a1marinecare.ca",
      preferredDate: input.date,
      preferredTime: input.timeSlot,
      utm: input.utm && Object.keys(input.utm).length ? input.utm : undefined,
    }) ?? {
      site: "a1marinecare.ca",
    },
  };
}

export function signEmpireVuBody(rawBody: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")}`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fan out an envelope to EmpireVu's /api/intake. Never throws. Skips cleanly if
 * unconfigured or disabled — the legacy hub + durable log remain the source of truth.
 */
export async function forwardToEmpireVu(envelope: LeadEnvelope, attempts = 3): Promise<void> {
  if (process.env.EMPIREVU_INTAKE_DISABLED === "1") return;
  const url = process.env.EMPIREVU_INTAKE_URL;
  const secret = process.env.EMPIREVU_INTAKE_SECRET;
  if (!url || !secret) {
    console.log("[empirevu] EMPIREVU_INTAKE_URL/SECRET not set — skipping (legacy hub + durable log unaffected)");
    return;
  }
  const rawBody = JSON.stringify(envelope);
  const headers = { "Content-Type": "application/json", "x-empirevu-signature": signEmpireVuBody(rawBody, secret) };

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, { method: "POST", headers, body: rawBody });
      if (res.ok) {
        console.log(`[empirevu] forwarded ${envelope.formType} (attempt ${attempt}, ${res.status})`);
        return;
      }
      console.error(`[empirevu] responded ${res.status} (attempt ${attempt})`);
    } catch (err) {
      console.error(`[empirevu] forward failed (attempt ${attempt}):`, err instanceof Error ? err.message : String(err));
    }
    if (attempt < attempts) await sleep(attempt * 750);
  }
  console.error(`[empirevu] gave up after ${attempts} attempts — legacy hub + durable log still hold the lead`);
}
