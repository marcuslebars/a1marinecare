import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

// Retell custom-function endpoints for Marina (the phone receptionist).
//
// Every request from Retell carries a shared secret in `x-a1-retell-secret`
// (configured on each custom function in the Retell dashboard). With
// "Payload: args only" OFF, Retell wraps the LLM's arguments in
// `{ name, args, call }` — `call` is the trusted call context (call_id,
// from_number, …) supplied by Retell's telephony layer, not by the model.
// We accept both shapes so a bare-args configuration still works.

export type RetellCallContext = {
  callId: string | null;
  fromNumber: string | null;
  toNumber: string | null;
  agentId: string | null;
  direction: string | null;
};

export type RetellFunctionRequest<TArgs = Record<string, unknown>> = {
  name: string | null;
  args: TArgs;
  call: RetellCallContext;
};

export function isRetellFunctionsConfigured(): boolean {
  return Boolean(process.env.RETELL_FUNCTION_SECRET?.trim());
}

/** Timing-safe shared-secret check. Fails closed when the secret isn't set. */
export function verifyRetellFunctionSecret(request: Request): boolean {
  const expected = process.env.RETELL_FUNCTION_SECRET?.trim();
  const provided = request.headers.get("x-a1-retell-secret")?.trim();
  if (!expected || !provided) return false;
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseRetellFunctionBody<TArgs = Record<string, unknown>>(body: unknown): RetellFunctionRequest<TArgs> {
  const obj = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const hasEnvelope = obj.args && typeof obj.args === "object";
  const args = (hasEnvelope ? obj.args : obj) as TArgs;
  const call = (obj.call && typeof obj.call === "object" ? obj.call : {}) as Record<string, unknown>;
  return {
    name: str(obj.name),
    args,
    call: {
      callId: str(call.call_id),
      fromNumber: str(call.from_number),
      toNumber: str(call.to_number),
      agentId: str(call.agent_id),
      direction: str(call.direction),
    },
  };
}

/**
 * Shared guard for every /api/retell/functions/* route. Returns a ready
 * response on failure, or the parsed request on success. Failure bodies are
 * written for the LLM to read aloud gracefully — Retell hands the response
 * text to the model whatever the status code.
 */
export async function readRetellFunctionRequest<TArgs = Record<string, unknown>>(
  request: Request,
): Promise<{ ok: true; data: RetellFunctionRequest<TArgs> } | { ok: false; response: NextResponse }> {
  if (!isRetellFunctionsConfigured()) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, reason: "not_configured", say: "I can't do that from here right now — I'll have Marcus follow up with you." }, { status: 503 }),
    };
  }
  if (!verifyRetellFunctionSecret(request)) {
    return { ok: false, response: NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 }) };
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, response: NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 }) };
  }
  return { ok: true, data: parseRetellFunctionBody<TArgs>(body) };
}

/** Normalise a caller-supplied or telephony-supplied phone number to E.164 where possible. */
export function normalizePhone(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 7) return value.trim();
  return null;
}

/** Deterministic per-phone placeholder so CRM dedup by email behaves like dedup by phone. */
export function placeholderEmailForPhone(phoneE164: string): string {
  return `${phoneE164.replace(/\D/g, "")}@no-email.a1marinecare.ca`;
}

export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return Boolean(email && email.endsWith("@no-email.a1marinecare.ca"));
}
