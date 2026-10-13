// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

import { DEFAULT_FORWARD_URL, forwardToEverdoer } from "./webhook";

describe("Retell webhook pass-through to Everdoer", () => {
  const realFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = realFetch;
    delete process.env.RETELL_FORWARD_WEBHOOK_URL;
  });

  it("defaults to the new api.everdoer.com host (same path)", () => {
    expect(DEFAULT_FORWARD_URL).toBe("https://api.everdoer.com/api/retell/webhook");
  });

  it("forwards the raw body + Retell signature untouched to the default URL", async () => {
    const spy = vi.fn((_url: string, _opts: RequestInit) => Promise.resolve({ ok: true, status: 200 } as Response));
    globalThis.fetch = spy as never;
    await forwardToEverdoer('{"event":"call_analyzed"}', "v=1,d=abc");
    const [url, opts] = spy.mock.calls[0];
    expect(url).toBe("https://api.everdoer.com/api/retell/webhook");
    expect(opts.body).toBe('{"event":"call_analyzed"}');
    expect(opts.headers).toEqual({ "content-type": "application/json", "x-retell-signature": "v=1,d=abc" });
  });

  it("honours RETELL_FORWARD_WEBHOOK_URL and `off`", async () => {
    const spy = vi.fn((_url: string, _opts: RequestInit) => Promise.resolve({ ok: true, status: 200 } as Response));
    globalThis.fetch = spy as never;
    process.env.RETELL_FORWARD_WEBHOOK_URL = "https://other.example/hook";
    await forwardToEverdoer("{}", null);
    expect(spy.mock.calls[0][0]).toBe("https://other.example/hook");
    process.env.RETELL_FORWARD_WEBHOOK_URL = "off";
    await forwardToEverdoer("{}", null);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
