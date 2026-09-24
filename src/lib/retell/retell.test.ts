import { describe, expect, it } from "vitest";

import { normalizePhone, parseRetellFunctionBody, placeholderEmailForPhone, isPlaceholderEmail } from "./auth";
import { parseEngineType, parseHullType, parseLengthFt, resolveLocationSlug } from "./phone-quote";
import { addDays, bookedCount, earliestBookableDate, findAvailableSlots, isValidDateString, parseWindow, spokenLabel, weekdayOf } from "./slots";

describe("retell function payload", () => {
  it("unwraps the { name, args, call } envelope", () => {
    const parsed = parseRetellFunctionBody({ name: "quote_shrink_wrap", args: { boat_length_ft: 24 }, call: { call_id: "c1", from_number: "+17055551234", agent_id: "a1" } });
    expect(parsed.name).toBe("quote_shrink_wrap");
    expect(parsed.args).toEqual({ boat_length_ft: 24 });
    expect(parsed.call.callId).toBe("c1");
    expect(parsed.call.fromNumber).toBe("+17055551234");
  });
  it("accepts bare args when 'args only' is on", () => {
    const parsed = parseRetellFunctionBody({ boat_length_ft: 24 });
    expect(parsed.args).toEqual({ boat_length_ft: 24 });
    expect(parsed.call.callId).toBeNull();
  });
  it("normalises phones to E.164", () => {
    expect(normalizePhone("705-996-1010")).toBe("+17059961010");
    expect(normalizePhone("1 (705) 996 1010")).toBe("+17059961010");
    expect(normalizePhone("+17059961010")).toBe("+17059961010");
    expect(normalizePhone("123")).toBeNull();
  });
  it("placeholder email is per-phone and detectable", () => {
    const e = placeholderEmailForPhone("+17059961010");
    expect(e).toBe("17059961010@no-email.a1marinecare.ca");
    expect(isPlaceholderEmail(e)).toBe(true);
    expect(isPlaceholderEmail("marcus@tilotto.com")).toBe(false);
  });
});

describe("phone quote parsing", () => {
  it("maps spoken hull types onto the calculator's enum", () => {
    expect(parseHullType("Pontoon")).toBe("pontoon");
    expect(parseHullType("it's a bow rider")).toBe("bowrider");
    expect(parseHullType("Sea-Doo")).toBe("pwc");
    expect(parseHullType("fishing boat")).toBe("other");
    expect(parseHullType(undefined)).toBe("other");
  });
  it("maps engines and lengths", () => {
    expect(parseEngineType("outboard")).toBe("outboard");
    expect(parseEngineType("I/O")).toBe("sterndrive");
    expect(parseEngineType("MerCruiser sterndrive")).toBe("sterndrive");
    expect(parseEngineType("inboard")).toBe("inboard");
    expect(parseEngineType("none")).toBeNull();
    expect(parseLengthFt("24 feet")).toBe(24);
    expect(parseLengthFt(21.5)).toBe(22);
    expect(parseLengthFt("")).toBeNull();
  });
  it("resolves towns to location slugs", () => {
    expect(resolveLocationSlug("Penetang")).toBe("georgian-bay");
    expect(resolveLocationSlug("Penetanguishene")).toBe("penetanguishene");
    expect(resolveLocationSlug("I'm in Barrie")).toBe("barrie");
    expect(resolveLocationSlug("Tiny township")).toBe("midland");
    expect(resolveLocationSlug("")).toBe("georgian-bay");
  });
});

describe("half-day slots", () => {
  // Thu 2026-09-24 14:00 Toronto = 18:00Z
  const now = new Date("2026-09-24T18:00:00Z");

  it("date helpers", () => {
    expect(isValidDateString("2026-09-31")).toBe(false);
    expect(isValidDateString("2026-10-01")).toBe(true);
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(weekdayOf("2026-09-27")).toBe(0); // Sunday
    expect(parseWindow("Morning")).toBe("morning");
    expect(parseWindow("pm")).toBe("afternoon");
    expect(parseWindow("noon")).toBeNull();
    expect(spokenLabel("2026-10-01", "morning")).toBe("Thursday, October 1st in the morning");
    expect(spokenLabel("2026-10-22", "afternoon")).toBe("Thursday, October 22nd in the afternoon");
  });

  it("honours 24h lead time and skips Sundays", () => {
    expect(earliestBookableDate(now)).toBe("2026-09-25");
    const slots = findAvailableSlots({ now, counts: [] });
    expect(slots.map((s) => `${s.date} ${s.window}`)).toEqual(["2026-09-25 morning", "2026-09-25 afternoon", "2026-09-26 morning"]);
    const sat = findAvailableSlots({ now, counts: [], preferredDate: "2026-09-26", limit: 4 });
    expect(sat.map((s) => s.date)).toEqual(["2026-09-26", "2026-09-26", "2026-09-28", "2026-09-28"]);
  });

  it("counts capacity across every slot string in a window", () => {
    const counts = [
      { date: "2026-09-25", timeSlot: "08:00", count: 1 },
      { date: "2026-09-25", timeSlot: "09:00", count: 1 },
      { date: "2026-09-25", timeSlot: "13:00", count: 1 },
    ];
    expect(bookedCount(counts, "2026-09-25", "morning")).toBe(2);
    const slots = findAvailableSlots({ now, counts });
    expect(slots[0]).toMatchObject({ date: "2026-09-25", window: "afternoon", remaining: 1 });
  });

  it("puts an open preferred window first and prefers that window on later days", () => {
    const slots = findAvailableSlots({ now, counts: [], preferredDate: "2026-09-29", preferredWindow: "afternoon" });
    expect(slots.map((s) => `${s.date} ${s.window}`)).toEqual(["2026-09-29 afternoon", "2026-09-29 morning", "2026-09-30 afternoon"]);
  });

  it("ignores a preferred date inside the lead time", () => {
    const slots = findAvailableSlots({ now, counts: [], preferredDate: "2026-09-24", preferredWindow: "morning" });
    expect(slots[0].date).toBe("2026-09-25");
  });
});

describe("retell webhook", () => {
  it("verifies v=ts,d=hmac signatures and rejects stale or wrong ones", async () => {
    const { createHmac } = await import("node:crypto");
    const { verifyRetellSignature, prettyPhone, buildOwnerSms } = await import("./webhook");
    const key = "key_test";
    const body = JSON.stringify({ event: "call_started", call: { call_id: "c1" } });
    const ts = String(Date.now());
    const d = createHmac("sha256", key).update(body + ts).digest("hex");
    expect(verifyRetellSignature(body, `v=${ts},d=${d}`, key)).toBe(true);
    expect(verifyRetellSignature(body + " ", `v=${ts},d=${d}`, key)).toBe(false);
    expect(verifyRetellSignature(body, `v=${ts},d=${d}`, "other")).toBe(false);
    const old = String(Date.now() - 10 * 60_000);
    const dOld = createHmac("sha256", key).update(body + old).digest("hex");
    expect(verifyRetellSignature(body, `v=${old},d=${dOld}`, key)).toBe(false);
    expect(verifyRetellSignature(body, null, key)).toBe(false);
    expect(prettyPhone("+17059961010")).toBe("705-996-1010");
    const sms = await buildOwnerSms({ event: "call_started", call: { direction: "inbound", from_number: "+17055551234", start_timestamp: Date.now() } });
    expect(sms).toContain("705-555-1234");
    expect(await buildOwnerSms({ event: "call_started", call: { direction: "outbound", from_number: "+17055551234" } })).toBeNull();
    const done = await buildOwnerSms({
      event: "call_analyzed",
      call: { direction: "inbound", from_number: "+17055551234", duration_ms: 200_000, disconnection_reason: "call_transfer", call_analysis: { call_summary: "Caller wanted a wrap.", custom_analysis_data: { caller_name: "Dana Lee", boat_length_ft: 24, boat_type: "bowrider", booked: true, deposit_link_sent: true } } },
    });
    expect(done).toContain("Dana Lee · 24 ft bowrider");
    expect(done).toContain("3m20s");
    expect(done).toContain("Booked");
    expect(done).toContain("deposit link sent");
    expect(done).toContain("transferred to you");
  });
});
