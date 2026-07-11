import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import { buildCareEnvelope, forwardToEmpireVu, signEmpireVuBody, type CareLeadInput, type LeadEnvelope } from "./empirevu";

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

describe("forwardToEmpireVu is additive + best-effort", () => {
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
    delete process.env.EMPIREVU_INTAKE_URL;
    delete process.env.EMPIREVU_INTAKE_SECRET;
    delete process.env.EMPIREVU_INTAKE_DISABLED;
  });

  it("does not call out when unconfigured", async () => {
    const spy = vi.fn();
    globalThis.fetch = spy as never;
    await forwardToEmpireVu(envelope);
    expect(spy).not.toHaveBeenCalled();
  });

  it("does not call out when disabled", async () => {
    process.env.EMPIREVU_INTAKE_URL = "https://hub.example/api/intake";
    process.env.EMPIREVU_INTAKE_SECRET = "s";
    process.env.EMPIREVU_INTAKE_DISABLED = "1";
    const spy = vi.fn();
    globalThis.fetch = spy as never;
    await forwardToEmpireVu(envelope);
    expect(spy).not.toHaveBeenCalled();
  });

  it("signs + posts when configured", async () => {
    process.env.EMPIREVU_INTAKE_URL = "https://hub.example/api/intake";
    process.env.EMPIREVU_INTAKE_SECRET = "s";
    const spy = vi.fn((_url: string, _opts: RequestInit) => Promise.resolve({ ok: true, status: 200 } as Response));
    globalThis.fetch = spy as never;
    await forwardToEmpireVu(envelope);
    expect(spy).toHaveBeenCalledTimes(1);
    const [url, opts] = spy.mock.calls[0];
    expect(url).toBe("https://hub.example/api/intake");
    expect((opts.headers as Record<string, string>)["x-empirevu-signature"]).toBe(
      signEmpireVuBody(opts.body as string, "s"),
    );
  });

  it("never throws when the endpoint fails", async () => {
    process.env.EMPIREVU_INTAKE_URL = "https://hub.example/api/intake";
    process.env.EMPIREVU_INTAKE_SECRET = "s";
    globalThis.fetch = (async () => {
      throw new Error("network down");
    }) as never;
    await expect(forwardToEmpireVu(envelope, 1)).resolves.toBeUndefined();
  });
});
