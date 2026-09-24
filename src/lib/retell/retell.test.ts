// @vitest-environment node

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

describe("caller lookup + deposit expiry", () => {
  it("formats caller variables as strings and greets known callers", async () => {
    const { toDynamicVariables, UNKNOWN_CALLER, last10, ageLabel } = await import("./caller-lookup");
    const unknown = toDynamicVariables(UNKNOWN_CALLER);
    expect(unknown.caller_known).toBe("false");
    expect(unknown.greeting).toContain("shrink wrapping, or something else");
    expect(Object.values(unknown).every((v) => typeof v === "string")).toBe(true);
    const known = toDynamicVariables({ ...UNKNOWN_CALLER, known: true, firstName: "Dana", fullName: "Dana Lee", boat: "24 ft bowrider", quoteId: "q-1", quoteTotal: "$672", quoteAgeLabel: "yesterday", bookedWindow: "Friday, September 25th in the morning", depositPaid: true, depositLinkSent: true });
    expect(known.greeting).toBe("Thanks for calling A1 Marine Care, this is Marina. Hi Dana — are you calling about the 24 ft bowrider?");
    expect(known.deposit_paid).toBe("true");
    expect(known.quote_id).toBe("q-1");
    expect(last10("705-996-1010")).toBe("7059961010");
    expect(last10("+17059961010")).toBe("7059961010");
    expect(last10("1010")).toBeNull();
    const now = new Date("2026-09-24T12:00:00Z");
    expect(ageLabel(new Date("2026-09-24T02:00:00Z"), now)).toBe("earlier today");
    expect(ageLabel(new Date("2026-09-23T02:00:00Z"), now)).toBe("yesterday");
    expect(ageLabel(new Date("2026-09-20T12:00:00Z"), now)).toBe("4 days ago");
  });

  it("clamps deposit link expiry to Stripe's 30 min – 24 h window", async () => {
    const { depositExpiryMinutes } = await import("@/lib/stripe");
    expect(depositExpiryMinutes(undefined)).toBe(30);
    expect(depositExpiryMinutes(5)).toBe(30);
    expect(depositExpiryMinutes(720)).toBe(720);
    expect(depositExpiryMinutes(5000)).toBe(720);
  });
});

describe("digest", () => {
  it("computes Toronto day boundaries across DST", async () => {
    const { torontoDayRange } = await import("./digest");
    const summer = torontoDayRange("2026-09-23");
    expect(summer.start.toISOString()).toBe("2026-09-23T04:00:00.000Z");
    expect(summer.end.toISOString()).toBe("2026-09-24T04:00:00.000Z");
    const winter = torontoDayRange("2026-12-10");
    expect(winter.start.toISOString()).toBe("2026-12-10T05:00:00.000Z");
  });
  it("builds a readable empty digest without a database", async () => {
    const { buildDigest } = await import("./digest");
    const saved = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    const d = await buildDigest(new Date("2026-09-24T11:00:00Z"));
    if (saved) process.env.DATABASE_URL = saved;
    expect(d.forDate).toBe("2026-09-23");
    expect(d.text).toContain("Marina digest");
  });
});

describe("customer quote email", () => {
  it("puts the deposit button before the booking link and shows the total", async () => {
    const { buildQuoteCustomerEmail } = await import("@/lib/quote-customer-email");
    const { subject, html } = buildQuoteCustomerEmail(
      { quoteId: "q-123", contactName: "Dana Lee", contactEmail: "dana@example.com", lengthFt: 24, hullType: "bowrider", winterizationLabel: null, lineItems: [{ key: "shrink_wrap", label: "Mobile shrink wrap", description: "24 ft × $28/ft", amountCents: 67200 }], subtotalCents: 67200, requiresManualReview: false },
      "https://checkout.stripe.com/c/pay/cs_test_1",
      "https://www.a1marinecare.ca/booking?quoteId=q-123",
    );
    expect(subject).toBe("Your shrink wrap quote: $672 + HST for the 24 ft bowrider");
    expect(html.indexOf("checkout.stripe.com")).toBeGreaterThan(-1);
    expect(html.indexOf("checkout.stripe.com")).toBeLessThan(html.indexOf("/booking?quoteId=q-123"));
    expect(html).toContain("Step 1 — hold your spot");
    expect(html).toContain("Step 2 — pick your wrap date");
    expect(html).toContain("Hi Dana");
  });
  it("swaps the deposit step for a manual-review note on oversize boats", async () => {
    const { buildQuoteCustomerEmail } = await import("@/lib/quote-customer-email");
    const { subject, html } = buildQuoteCustomerEmail(
      { quoteId: "q-9", contactName: "Sam", contactEmail: "s@example.com", lengthFt: 44, hullType: "cruiser", winterizationLabel: null, lineItems: [], subtotalCents: 123200, requiresManualReview: true },
      null,
      "https://www.a1marinecare.ca/booking?quoteId=q-9",
    );
    expect(subject).toContain("Marcus will confirm the price");
    expect(html).toContain("we'll confirm the price");
    expect(html).not.toContain("checkout.stripe.com");
  });
});

describe("customer follow-ups", () => {
  it("keeps texts inside Toronto civil hours", async () => {
    const { inWindow, torontoHour, NUDGE_HOURS, REMINDER_HOURS } = await import("./followups");
    expect(torontoHour(new Date("2026-09-24T13:00:00Z"))).toBe(9); // EDT
    expect(inWindow(new Date("2026-09-24T13:00:00Z"), NUDGE_HOURS)).toBe(true);
    expect(inWindow(new Date("2026-09-24T07:30:00Z"), NUDGE_HOURS)).toBe(false); // 3:30am
    expect(inWindow(new Date("2026-09-24T20:00:00Z"), REMINDER_HOURS)).toBe(true); // 4pm
    expect(inWindow(new Date("2026-09-24T13:00:00Z"), REMINDER_HOURS)).toBe(false); // 9am
  });
  it("writes the texts in Marina's voice with the links in order", async () => {
    const { nudgeText, reminderText } = await import("./followups");
    const n = nudgeText({ firstName: "Dana", boat: "24 ft bowrider", total: "$672", depositUrl: "https://checkout.stripe.com/x", bookingUrl: "https://www.a1marinecare.ca/booking?quoteId=q" });
    expect(n.startsWith("Hi Dana, Marina from A1 Marine Care.")).toBe(true);
    expect(n.indexOf("checkout.stripe.com")).toBeLessThan(n.indexOf("/booking?quoteId="));
    expect(n).toContain("$672");
    const r = reminderText({ firstName: "Dana", boat: "24 ft bowrider", window: "morning" });
    expect(r).toContain("tomorrow morning");
    expect(r).toContain("705-996-1010");
  });
});

describe("post-call quote text", () => {
  it("thanks the caller and leads with the deposit link", async () => {
    const { postCallText } = await import("./followups");
    const t = postCallText({ firstName: "Dana", boat: "24 ft bowrider", total: "$672", depositUrl: "https://checkout.stripe.com/x", bookingUrl: "https://www.a1marinecare.ca/booking?quoteId=q" });
    expect(t.startsWith("Hi Dana, Marina from A1 Marine Care — thanks for calling!")).toBe(true);
    expect(t).toContain("$672 + HST");
    expect(t.indexOf("checkout.stripe.com")).toBeLessThan(t.indexOf("/booking?quoteId="));
  });
  it("drops the booking link when the caller already booked", async () => {
    const { postCallText } = await import("./followups");
    const t = postCallText({ firstName: "Dana", boat: "24 ft bowrider", total: "$672", depositUrl: "https://checkout.stripe.com/x", bookingUrl: "https://www.a1marinecare.ca/booking?quoteId=q", booked: true });
    expect(t).not.toContain("/booking?quoteId=");
    expect(t).toContain("checkout.stripe.com");
  });
});

describe("pick-date + abandoned-call texts", () => {
  it("pick-date text says the spot is held and links the booking page", async () => {
    const { pickDateText } = await import("./followups");
    const t = pickDateText({ firstName: "Dana", boat: "24 ft bowrider", bookingUrl: "https://www.a1marinecare.ca/booking?quoteId=q" });
    expect(t).toContain("deposit is in");
    expect(t).toContain("/booking?quoteId=q");
  });
  it("only treats real shrink-wrap callers who hung up as abandoned", async () => {
    const { looksAbandoned } = await import("./followups");
    const base = { event: "call_analyzed", call: { call_id: "c1", from_number: "+17055551234", direction: "inbound", duration_ms: 40_000, call_analysis: { call_summary: "Caller asked about shrink wrapping a pontoon and hung up." } } };
    expect(looksAbandoned(base)).toBe(true);
    expect(looksAbandoned({ ...base, call: { ...base.call, duration_ms: 8_000 } })).toBe(false);
    expect(looksAbandoned({ ...base, call: { ...base.call, disconnection_reason: "call_transfer" } })).toBe(false);
    expect(looksAbandoned({ ...base, call: { ...base.call, direction: "outbound" } })).toBe(false);
    expect(looksAbandoned({ ...base, call: { ...base.call, call_analysis: { in_voicemail: true, call_summary: "shrink wrap" } } })).toBe(false);
    expect(looksAbandoned({ ...base, call: { ...base.call, call_analysis: { call_summary: "Asked about detailing prices." } } })).toBe(false);
    expect(looksAbandoned({ ...base, event: "call_started" })).toBe(false);
  });
});
