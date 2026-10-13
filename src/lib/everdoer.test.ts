import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildCareEnvelope,
  everdoerEnv,
  forwardToEverdoer,
  resetLegacyEnvWarningsForTests,
  signEverdoerBody,
  type CareLeadInput,
  type LeadEnvelope,
} from "./everdoer";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
  JSON.parse(readFileSync(join(here, "__fixtures__", "lead-envelopes", name), "utf8"));

describe("care envelope builder matches the golden fixtures (drift guard)", () => {
  it("contact -> canonical envelope", () => {
    const input: CareLeadInput = {
      source: "contact",
      sourceSite: "a1marinecare",
      leadTag: "a1marinecare-contact",
      name: "Jane Boater",
      email: "jane@example.com",
      phone: "705-555-0101",
      service: "Full exterior detail",
      message: "Looking for a quote on my 28ft cruiser.",
    };
    expect(buildCareEnvelope(input, "2026-07-10T14:03:00.000Z")).toEqual(fixture("care-contact.json"));
  });

  it("quote -> canonical envelope (no leadTag -> derived brand tag; asset from boat fields)", () => {
    const input: CareLeadInput = {
      source: "quote",
      name: "Dana Fisher",
      email: "dana@example.com",
      phone: "705-555-0143",
      service: "Gelcoat restoration",
      boatLength: "32",
      boatType: "Sailboat",
      marina: "Queen's Cove",
      notes: "Quote for full exterior.",
    };
    expect(buildCareEnvelope(input, "2026-07-10T15:00:00.000Z")).toEqual(fixture("care-quote.json"));
  });

  it("booking -> canonical envelope (preferredDate/time in meta)", () => {
    const input: CareLeadInput = {
      source: "booking",
      name: "Sam Rivera",
      email: "sam@example.com",
      phone: "705-555-0177",
      service: "Spring detailing",
      boatLength: "22",
      marina: "Queen's Cove",
      date: "2026-05-01",
      timeSlot: "09:00",
      notes: "Before launch.",
    };
    expect(buildCareEnvelope(input, "2026-07-10T16:00:00.000Z")).toEqual(fixture("care-booking.json"));
  });
});

describe("forwardToEverdoer is additive + best-effort", () => {
  const envelope: LeadEnvelope = {
    schemaVersion: 1,
    source: "a1marinecare-contact",
    sourceSite: "a1marinecare",
    formType: "contact",
    receivedAt: "2026-07-10T12:00:00.000Z",
    contact: { email: "a@b.com" },
  };
  const realFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = realFetch;
    for (const prefix of ["EVERDOER", "EMPIREVU"]) {
      delete process.env[`${prefix}_INTAKE_URL`];
      delete process.env[`${prefix}_INTAKE_SECRET`];
      delete process.env[`${prefix}_INTAKE_DISABLED`];
    }
    resetLegacyEnvWarningsForTests();
    vi.restoreAllMocks();
  });

  it("does not call out when unconfigured", async () => {
    const spy = vi.fn();
    globalThis.fetch = spy as never;
    await forwardToEverdoer(envelope);
    expect(spy).not.toHaveBeenCalled();
  });

  it("does not call out when disabled", async () => {
    process.env.EVERDOER_INTAKE_URL = "https://hub.example/api/intake";
    process.env.EVERDOER_INTAKE_SECRET = "s";
    process.env.EVERDOER_INTAKE_DISABLED = "1";
    const spy = vi.fn();
    globalThis.fetch = spy as never;
    await forwardToEverdoer(envelope);
    expect(spy).not.toHaveBeenCalled();
  });

  it("signs + posts when configured", async () => {
    process.env.EVERDOER_INTAKE_URL = "https://hub.example/api/intake";
    process.env.EVERDOER_INTAKE_SECRET = "s";
    const spy = vi.fn((_url: string, _opts: RequestInit) => Promise.resolve({ ok: true, status: 200 } as Response));
    globalThis.fetch = spy as never;
    await forwardToEverdoer(envelope);
    expect(spy).toHaveBeenCalledTimes(1);
    const [url, opts] = spy.mock.calls[0];
    expect(url).toBe("https://hub.example/api/intake");
    expect((opts.headers as Record<string, string>)["x-everdoer-signature"]).toBe(
      signEverdoerBody(opts.body as string, "s"),
    );
  });

  it("never throws when the endpoint fails", async () => {
    process.env.EVERDOER_INTAKE_URL = "https://hub.example/api/intake";
    process.env.EVERDOER_INTAKE_SECRET = "s";
    globalThis.fetch = (async () => {
      throw new Error("network down");
    }) as never;
    await expect(forwardToEverdoer(envelope, 1)).resolves.toBeUndefined();
  });

  it("sends only the x-everdoer-signature header, byte-identical HMAC (sha256=<hex>)", async () => {
    process.env.EVERDOER_INTAKE_URL = "https://api.everdoer.com/api/intake";
    process.env.EVERDOER_INTAKE_SECRET = "s";
    const spy = vi.fn((_url: string, _opts: RequestInit) => Promise.resolve({ ok: true, status: 200 } as Response));
    globalThis.fetch = spy as never;
    await forwardToEverdoer(envelope);
    const [url, opts] = spy.mock.calls[0];
    expect(url).toBe("https://api.everdoer.com/api/intake");
    const headers = opts.headers as Record<string, string>;
    expect(Object.keys(headers).sort()).toEqual(["Content-Type", "x-everdoer-signature"]);
    expect(Object.keys(headers).some((h) => h.toLowerCase().startsWith("x-empirevu"))).toBe(false);
    // Same scheme as before the rename: HMAC-SHA256(secret, raw body), hex, "sha256=" prefix.
    expect(signEverdoerBody("{}", "s")).toBe("sha256=143ca8d517ba1b181025d732b1cf275d90104fca57bb02a565542978aa18c4b6");
    expect(headers["x-everdoer-signature"]).toBe(
      `sha256=${createHmac("sha256", "s").update(opts.body as string, "utf8").digest("hex")}`,
    );
  });
});

describe("EVERDOER_* env with EMPIREVU_* fallback (rebrand shim)", () => {
  afterEach(() => {
    for (const prefix of ["EVERDOER", "EMPIREVU"]) {
      delete process.env[`${prefix}_INTAKE_URL`];
      delete process.env[`${prefix}_INTAKE_SECRET`];
      delete process.env[`${prefix}_INTAKE_DISABLED`];
    }
    resetLegacyEnvWarningsForTests();
    vi.restoreAllMocks();
  });

  it("new name wins over the old one, without a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env.EVERDOER_INTAKE_URL = "https://api.everdoer.com/api/intake";
    process.env.EMPIREVU_INTAKE_URL = "https://old.example/api/intake";
    expect(everdoerEnv("INTAKE_URL")).toBe("https://api.everdoer.com/api/intake");
    expect(warn).not.toHaveBeenCalled();
  });

  it("old name still works and warns once per process", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env.EMPIREVU_INTAKE_SECRET = " secret-with-space ";
    expect(everdoerEnv("INTAKE_SECRET")).toBe(" secret-with-space ");
    expect(everdoerEnv("INTAKE_SECRET")).toBe(" secret-with-space ");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith("[everdoer] using legacy env EMPIREVU_INTAKE_SECRET; set EVERDOER_INTAKE_SECRET");
  });

  it("returns undefined when neither is set", () => {
    expect(everdoerEnv("INTAKE_DISABLED")).toBeUndefined();
  });

  it("forwards with only the legacy env set (same signature, new header name)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env.EMPIREVU_INTAKE_URL = "https://hub.example/api/intake";
    process.env.EMPIREVU_INTAKE_SECRET = "s";
    const spy = vi.fn((_url: string, _opts: RequestInit) => Promise.resolve({ ok: true, status: 200 } as Response));
    globalThis.fetch = spy as never;
    await forwardToEverdoer({
      schemaVersion: 1,
      source: "a1marinecare-contact",
      sourceSite: "a1marinecare",
      formType: "contact",
      receivedAt: "2026-07-10T12:00:00.000Z",
      contact: { email: "a@b.com" },
    });
    const [url, opts] = spy.mock.calls[0];
    expect(url).toBe("https://hub.example/api/intake");
    expect((opts.headers as Record<string, string>)["x-everdoer-signature"]).toBe(signEverdoerBody(opts.body as string, "s"));
  });

  it("legacy EMPIREVU_INTAKE_DISABLED=1 still disables", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env.EVERDOER_INTAKE_URL = "https://hub.example/api/intake";
    process.env.EVERDOER_INTAKE_SECRET = "s";
    process.env.EMPIREVU_INTAKE_DISABLED = "1";
    const spy = vi.fn();
    globalThis.fetch = spy as never;
    await forwardToEverdoer({
      schemaVersion: 1,
      source: "a1marinecare-contact",
      sourceSite: "a1marinecare",
      formType: "contact",
      receivedAt: "2026-07-10T12:00:00.000Z",
      contact: { email: "a@b.com" },
    });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe(".env.example points at the new host", () => {
  it("EVERDOER_INTAKE_URL and RETELL_FORWARD_WEBHOOK_URL use api.everdoer.com", () => {
    const env = readFileSync(join(here, "..", "..", ".env.example"), "utf8");
    expect(env).toMatch(/^EVERDOER_INTAKE_URL=https:\/\/api\.everdoer\.com\/api\/intake$/m);
    expect(env).toMatch(/^RETELL_FORWARD_WEBHOOK_URL=https:\/\/api\.everdoer\.com\/api\/retell\/webhook$/m);
  });
});
