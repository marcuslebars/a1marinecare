// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

import { fetchRecentCalls, listCallsBody } from "./calls";

type Req = { url: string; method: string; body: unknown };
let requests: Req[] = [];

function respond(url: string, init?: RequestInit): Response {
  const body = init?.body ? JSON.parse(String(init.body)) : undefined;
  requests.push({ url, method: init?.method ?? "GET", body });
  if (url.endsWith("/v3/list-calls")) {
    const page = body.pagination_key === "p2"
      ? { items: [{ call_id: "c3" }], has_more: false }
      : { items: [{ call_id: "c1" }, { call_id: "c2" }], has_more: true, pagination_key: "p2" };
    return new Response(JSON.stringify(page), { status: 200 });
  }
  const id = url.split("/v2/get-call/")[1];
  if (id === "c2") return new Response("nope", { status: 500 });
  return new Response(JSON.stringify({ call_id: id, transcript: `Agent: hi (${id})` }), { status: 200 });
}

beforeEach(() => {
  requests = [];
  vi.stubEnv("RETELL_API_KEY", "key_test");
  vi.stubEnv("RETELL_AGENT_ID", "agent_1");
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => respond(url, init)));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Retell call review — v3 list-calls", () => {
  it("builds the v3 filter (agent objects, ge timestamp filter) — not the removed v2 shape", () => {
    expect(listCallsBody({ agentId: "agent_1", sinceMs: 1000, limit: 50 })).toEqual({
      filter_criteria: { agent: [{ agent_id: "agent_1" }], start_timestamp: { type: "number", op: "ge", value: 1000 } },
      sort_order: "descending",
      limit: 50,
    });
    expect(listCallsBody({ sinceMs: 1, limit: 5, paginationKey: "k" })).toMatchObject({ filter_criteria: { start_timestamp: { value: 1 } }, pagination_key: "k" });
    expect(listCallsBody({ sinceMs: 1, limit: 5 }).filter_criteria).not.toHaveProperty("agent");
  });

  it("reads items across pages, then fills transcripts from get-call (a failed fetch keeps the call)", async () => {
    const calls = await fetchRecentCalls(7, 50);
    expect(calls.map((c) => c.call_id)).toEqual(["c1", "c2", "c3"]);
    expect(calls.map((c) => c.transcript)).toEqual(["Agent: hi (c1)", undefined, "Agent: hi (c3)"]);
    const lists = requests.filter((r) => r.url.endsWith("/v3/list-calls"));
    expect(lists).toHaveLength(2);
    expect(lists.every((r) => r.method === "POST")).toBe(true);
    expect(requests.some((r) => /\/v2\/list-calls|\/list-calls$/.test(r.url) && !r.url.includes("/v3/"))).toBe(false);
  });

  it("stops at the limit", async () => {
    const calls = await fetchRecentCalls(7, 2);
    expect(calls.map((c) => c.call_id)).toEqual(["c1", "c2"]);
    expect(requests.filter((r) => r.url.endsWith("/v3/list-calls"))).toHaveLength(1);
  });
});
