// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── In-memory lead_events (only what the outbound queue uses) ─────────────────

type Row = { id: string; phone: string; customerName: string; createdAt: Date; leadType: string | null; metadata: Record<string, unknown> };
const store: Row[] = [];
let seq = 0;

type JsonPathFilter = { path: string[]; equals: unknown };
function matches(row: Row, where: Record<string, unknown>): boolean {
  if (where.id !== undefined && row.id !== where.id) return false;
  if (where.leadType !== undefined && row.leadType !== where.leadType) return false;
  if (where.phone !== undefined && row.phone !== where.phone) return false;
  const created = where.createdAt as { gte?: Date } | undefined;
  if (created?.gte && row.createdAt < created.gte) return false;
  const m = where.metadata as JsonPathFilter | undefined;
  if (m && (row.metadata as Record<string, unknown>)[m.path[0]] !== m.equals) return false;
  return true;
}
const copy = (r: Row) => ({ ...r, metadata: { ...r.metadata } });

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    leadEvent: {
      findMany: async ({ where }: { where: Record<string, unknown> }) => store.filter((r) => matches(r, where)).sort((a, b) => +a.createdAt - +b.createdAt).map(copy),
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        const r = store.find((x) => matches(x, where));
        return r ? copy(r) : null;
      },
      findUnique: async ({ where }: { where: { id: string } }) => {
        const r = store.find((x) => x.id === where.id);
        return r ? copy(r) : null;
      },
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: { metadata: Record<string, unknown> } }) => {
        const hit = store.filter((r) => matches(r, where));
        for (const r of hit) r.metadata = { ...data.metadata };
        return { count: hit.length };
      },
      update: async ({ where, data }: { where: { id: string }; data: { metadata: Record<string, unknown> } }) => {
        const r = store.find((x) => x.id === where.id);
        if (!r) throw new Error("not found");
        r.metadata = { ...data.metadata };
        return copy(r);
      },
      create: async ({ data }: { data: { phone: string; customerName: string; leadType: string | null; metadata: Record<string, unknown> } }) => {
        const r: Row = { id: `row-${++seq}`, phone: data.phone, customerName: data.customerName, leadType: data.leadType, createdAt: clock, metadata: { ...data.metadata } };
        store.push(r);
        return copy(r);
      },
    },
    quoteLead: { findUnique: async () => null },
  },
}));

const sms: Array<{ to: string; body: string }> = [];
vi.mock("./deposit-link", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./deposit-link")>()),
  sendSms: async (to: string, body: string) => {
    sms.push({ to, body });
    return { ok: true, sid: "SM1" };
  },
}));

vi.mock("./caller-lookup", async (importOriginal) => {
  const real = await importOriginal<typeof import("./caller-lookup")>();
  return {
    ...real,
    lookupCallerByPhone: async (phone: string) =>
      phone === "+14165550101"
        ? { ...real.UNKNOWN_CALLER, known: true, firstName: "Chris", fullName: "Chris Smith", boat: "20 ft bowrider", quoteId: "q1", quoteTotal: "$835" }
        : real.UNKNOWN_CALLER,
  };
});

// 10:00 Toronto (EST) on a Monday: inside calling hours and texting hours.
const MORNING = new Date("2026-11-02T15:00:00Z");
// 22:00 Toronto: outside both.
const NIGHT = new Date("2026-11-03T03:00:00Z");
let clock = MORNING;

const OWNER = "+17055550000";
const retellCalls: Array<Record<string, unknown>> = [];

beforeEach(() => {
  store.length = 0;
  sms.length = 0;
  retellCalls.length = 0;
  clock = MORNING;
  vi.stubEnv("DATABASE_URL", "postgres://test");
  vi.stubEnv("OWNER_SMS_NUMBER", OWNER);
  vi.stubEnv("RETELL_API_KEY", "key");
  vi.stubEnv("RETELL_AGENT_ID", "agent_1");
  vi.stubEnv("RETELL_FROM_NUMBER", "+14314304558");
  vi.stubEnv("OUTBOUND_OWNER_APPROVAL", "");
  vi.stubEnv("OUTBOUND_DEDUPE_HOURS", "0");
  vi.stubGlobal("fetch", async (_url: string, init: { body: string }) => {
    retellCalls.push(JSON.parse(init.body) as Record<string, unknown>);
    return new Response(JSON.stringify({ call_id: `call_${retellCalls.length}` }), { status: 201 });
  });
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const codeOf = (row: Row) => row.metadata.approvalCode as number;

describe("owner approval: pure helpers", () => {
  it("reads only a bare yes/no with an optional code as a decision", async () => {
    const { parseOwnerDecision } = await import("./outbound-approval");
    expect(parseOwnerDecision("Y")).toEqual({ approved: true, code: null });
    expect(parseOwnerDecision("yes 42")).toEqual({ approved: true, code: 42 });
    expect(parseOwnerDecision(" call #17. ")).toEqual({ approved: true, code: 17 });
    expect(parseOwnerDecision("N 42")).toEqual({ approved: false, code: 42 });
    expect(parseOwnerDecision("skip")).toEqual({ approved: false, code: null });
    expect(parseOwnerDecision("ok what's on tomorrow")).toBeNull();
    expect(parseOwnerDecision("no worries, I'll call him")).toBeNull();
    expect(parseOwnerDecision("thanks")).toBeNull();
    expect(parseOwnerDecision("")).toBeNull();
  });

  it("picks a code no waiting lead uses", async () => {
    const { pickApprovalCode } = await import("./outbound-approval");
    const taken = Array.from({ length: 90 }, (_, i) => i + 10).filter((c) => c !== 57);
    expect(pickApprovalCode(taken)).toBe(57);
    expect(pickApprovalCode(Array.from({ length: 90 }, (_, i) => i + 10))).toBe(100);
  });

  it("says who it is and what they asked for", async () => {
    const { approvalRequestText } = await import("./outbound-approval");
    const quote = approvalRequestText({ code: 12, name: "Chris Smith", phone: "+14165550101", reason: "shrink-wrap-quote", boat: "20 ft bowrider", total: "$835" });
    expect(quote).toContain("#12 New lead: Chris Smith, 416-555-0101. Shrink wrap quote for a 20 ft bowrider: $835 + tax.");
    expect(quote).toContain("Reply Y 12 to call or N 12 to skip.");
    const contact = approvalRequestText({ code: 33, name: "", phone: "+17055550199", reason: "contact", detail: 'Detailing - "how much for a 30 footer"' });
    expect(contact).toContain("#33 New lead: 705-555-0199. Contact form: Detailing");
  });
});

describe("owner approval: the flow", () => {
  it("a quote lead waits and texts the owner; nothing is dialed", async () => {
    const { queueOutboundCall } = await import("./outbound");
    const res = await queueOutboundCall({ to: "416-555-0101", name: "Chris Smith", reason: "shrink-wrap-quote", quoteId: "q1" }, MORNING);
    expect(res).toMatchObject({ queued: true, awaitingApproval: true });
    expect(store[0].metadata.status).toBe("awaiting_approval");
    expect(sms).toHaveLength(1);
    expect(sms[0].to).toBe(OWNER);
    expect(sms[0].body).toContain(`#${codeOf(store[0])} New lead: Chris Smith`);
    expect(sms[0].body).toContain("$835 + tax");
    expect(store[0].metadata.approvalTextAt).toBe(MORNING.toISOString());
    expect(vi.getTimerCount()).toBe(0); // no call timer until the owner says yes
    expect(retellCalls).toHaveLength(0);
  });

  it("Y <code> calls them now and says so", async () => {
    const { queueOutboundCall } = await import("./outbound");
    const { handleOwnerReply } = await import("./outbound-approval");
    await queueOutboundCall({ to: "416-555-0101", name: "Chris Smith", reason: "shrink-wrap-quote", quoteId: "q1" }, MORNING);
    const later = new Date(MORNING.getTime() + 5 * 60_000);
    const res = await handleOwnerReply(`Y ${codeOf(store[0])}`, later);
    expect(res).toEqual({ handled: true, reply: "Calling Chris now." });
    expect(retellCalls).toHaveLength(1);
    expect(retellCalls[0]).toMatchObject({ to_number: "+14165550101", from_number: "+14314304558" });
    expect(store[0].metadata).toMatchObject({ status: "placed", approvedAt: later.toISOString() });
    // A second Y finds nothing waiting.
    expect((await handleOwnerReply(`Y ${codeOf(store[0])}`, later)).reply).toMatch(/isn't waiting any more/);
    expect(retellCalls).toHaveLength(1);
  });

  it("N skips the lead", async () => {
    const { queueOutboundCall } = await import("./outbound");
    const { handleOwnerReply } = await import("./outbound-approval");
    await queueOutboundCall({ to: "705-555-0199", name: "Dana Lee", reason: "contact", detail: "Detailing" }, MORNING);
    expect(await handleOwnerReply("n", MORNING)).toEqual({ handled: true, reply: "OK - Marina won't call Dana." });
    expect(store[0].metadata).toMatchObject({ status: "skipped", skipReason: "Marcus said no" });
    expect(retellCalls).toHaveLength(0);
  });

  it("a bare Y with two leads waiting asks which one", async () => {
    const { queueOutboundCall } = await import("./outbound");
    const { handleOwnerReply } = await import("./outbound-approval");
    await queueOutboundCall({ to: "416-555-0101", name: "Chris Smith", reason: "shrink-wrap-quote", quoteId: "q1" }, MORNING);
    await queueOutboundCall({ to: "705-555-0199", name: "Dana Lee", reason: "contact" }, MORNING);
    expect(codeOf(store[0])).not.toBe(codeOf(store[1]));
    const res = await handleOwnerReply("yes", MORNING);
    expect(res.reply).toContain(`#${codeOf(store[0])} Chris · #${codeOf(store[1])} Dana`);
    expect(store.every((r) => r.metadata.status === "awaiting_approval")).toBe(true);
    expect(retellCalls).toHaveLength(0);
  });

  it("approved outside calling hours: Marina calls at 9:00 the next morning", async () => {
    const { queueOutboundCall } = await import("./outbound");
    const { handleOwnerReply } = await import("./outbound-approval");
    await queueOutboundCall({ to: "416-555-0101", name: "Chris Smith", reason: "shrink-wrap-quote", quoteId: "q1" }, MORNING);
    const res = await handleOwnerReply(`y ${codeOf(store[0])}`, NIGHT);
    expect(res.reply).toBe("OK - Marina will call Chris at 9:00 am tomorrow (calls go out 9am-8pm).");
    expect(store[0].metadata).toMatchObject({ status: "queued", dueAt: "2026-11-03T14:00:00.000Z" });
    expect(retellCalls).toHaveLength(0);
  });

  it("an overnight lead is texted at 8:00 and dropped after 24 h without a reply", async () => {
    const { queueOutboundCall } = await import("./outbound");
    const { sweepApprovals } = await import("./outbound-approval");
    clock = NIGHT;
    await queueOutboundCall({ to: "416-555-0101", name: "Chris Smith", reason: "shrink-wrap-quote", quoteId: "q1" }, NIGHT);
    expect(sms).toHaveLength(0);
    expect(await sweepApprovals(new Date("2026-11-03T12:30:00Z"))).toEqual({ expired: 0, texted: 0 }); // 7:30
    expect(await sweepApprovals(new Date("2026-11-03T13:05:00Z"))).toEqual({ expired: 0, texted: 1 }); // 8:05
    expect(await sweepApprovals(new Date("2026-11-03T14:05:00Z"))).toEqual({ expired: 0, texted: 0 }); // once only
    expect(sms).toHaveLength(1);
    expect(await sweepApprovals(new Date(NIGHT.getTime() + 24 * 3_600_000))).toEqual({ expired: 1, texted: 0 });
    expect(store[0].metadata).toMatchObject({ status: "skipped", skipReason: "no reply from Marcus" });
    expect(retellCalls).toHaveLength(0);
  });

  it("a customer who texted asking for a call is still called straight away", async () => {
    const { queueOutboundCall } = await import("./outbound");
    const res = await queueOutboundCall({ to: "416-555-0101", name: "Chris Smith", reason: "sms-reply", detail: "call me" }, MORNING);
    expect(res.awaitingApproval).toBeUndefined();
    expect(store[0].metadata.status).toBe("queued");
    expect(sms).toHaveLength(0);
    // The call timer is armed for ~2 min out (it re-checks the real clock when it fires).
    expect(vi.getTimerCount()).toBe(1);
    const { placeQueuedCall } = await import("./outbound");
    expect(await placeQueuedCall(store[0].id, new Date(MORNING.getTime() + 3 * 60_000))).toMatchObject({ placed: true });
    expect(retellCalls).toHaveLength(1);
  });

  it("OUTBOUND_OWNER_APPROVAL=0 (or no owner number) calls web leads on their own, as before", async () => {
    const { queueOutboundCall } = await import("./outbound");
    vi.stubEnv("OUTBOUND_OWNER_APPROVAL", "0");
    await queueOutboundCall({ to: "416-555-0101", name: "Chris Smith", reason: "shrink-wrap-quote", quoteId: "q1" }, MORNING);
    vi.stubEnv("OUTBOUND_OWNER_APPROVAL", "");
    vi.stubEnv("OWNER_SMS_NUMBER", "");
    await queueOutboundCall({ to: "705-555-0199", name: "Dana Lee", reason: "contact" }, MORNING);
    expect(store.map((r) => r.metadata.status)).toEqual(["queued", "queued"]);
    expect(sms).toHaveLength(0);
  });

  it("the owner's Y by text goes through the inbound webhook and gets an answer; other texts are left alone", async () => {
    const { queueOutboundCall } = await import("./outbound");
    const { handleInboundSms } = await import("./inbound-sms");
    await queueOutboundCall({ to: "416-555-0101", name: "Chris Smith", reason: "shrink-wrap-quote", quoteId: "q1" }, MORNING);
    sms.length = 0;
    const thanks = await handleInboundSms({ From: OWNER, Body: "thanks" }, MORNING);
    expect(thanks.reason).toBe("owner");
    expect(sms).toHaveLength(0);
    const res = await handleInboundSms({ From: OWNER, Body: `Y ${codeOf(store[0])}` }, MORNING);
    expect(res).toMatchObject({ relayed: false, reason: "owner_decision" });
    expect(sms).toEqual([{ to: OWNER, body: "Calling Chris now." }]);
    expect(retellCalls).toHaveLength(1);
  });
});
