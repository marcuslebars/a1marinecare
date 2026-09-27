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

describe("inbound customer texts", () => {
  it("verifies Twilio signatures against any of the URLs the number could be pointed at", async () => {
    const { twilioSignatureFor, verifyTwilioSignature, candidateUrls } = await import("./inbound-sms");
    const params = { From: "+17055551234", To: "+17055550000", Body: "Can you do Tuesday?", MessageSid: "SM1" };
    const token = "tok";
    const sig = twilioSignatureFor("https://a1marinecare.ca/api/sms/inbound", params, token);
    const urls = candidateUrls("http://0.0.0.0:8080/api/sms/inbound", "/api/sms/inbound");
    expect(urls).toContain("https://a1marinecare.ca/api/sms/inbound");
    expect(urls).toContain("https://www.a1marinecare.ca/api/sms/inbound");
    expect(verifyTwilioSignature(urls, params, sig, token)).toBe(true);
    expect(verifyTwilioSignature(urls, { ...params, Body: "tampered" }, sig, token)).toBe(false);
    expect(verifyTwilioSignature(urls, params, sig, "other")).toBe(false);
    expect(verifyTwilioSignature(urls, params, null, token)).toBe(false);
  });
  it("relays with who-this-is context and leaves opt-out keywords to Twilio", async () => {
    const { relayText, ackText, isOptOutKeyword } = await import("./inbound-sms");
    const { UNKNOWN_CALLER } = await import("./caller-lookup");
    const known = { ...UNKNOWN_CALLER, known: true, firstName: "Dana", fullName: "Dana Smith", boat: "24 ft bowrider", quoteTotal: "$672", bookedWindow: "Tuesday morning, September 29", depositPaid: true };
    const t = relayText(known, "+17055551234", "Can you come at 10 instead?");
    expect(t).toContain("Dana Smith");
    expect(t).toContain("24 ft bowrider · quoted $672 · booked Tuesday morning, September 29 · deposit PAID");
    expect(t).toContain("705-555-1234");
    expect(relayText(UNKNOWN_CALLER, "+17055551234", "hi")).toContain("new number, no quote on file");
    expect(ackText(known).startsWith("Thanks Dana")).toBe(true);
    expect(isOptOutKeyword(" STOP ")).toBe(true);
    expect(isOptOutKeyword("stop calling me at 10")).toBe(false);
  });
});

describe("outbound speed-to-lead calls", () => {
  it("schedules after the delay inside 9am–8pm Toronto, otherwise at the next 9am", async () => {
    const { scheduleFor } = await import("./outbound");
    // Sept 2026 is EDT (UTC-4).
    expect(scheduleFor(new Date("2026-09-25T14:00:00Z"), 2).toISOString()).toBe("2026-09-25T14:02:00.000Z"); // 10:00 → 10:02
    expect(scheduleFor(new Date("2026-09-25T10:00:00Z"), 2).toISOString()).toBe("2026-09-25T13:00:00.000Z"); // 06:00 → 09:00 today
    expect(scheduleFor(new Date("2026-09-26T02:00:00Z"), 2).toISOString()).toBe("2026-09-26T13:00:00.000Z"); // 22:00 → 09:00 tomorrow
    expect(scheduleFor(new Date("2026-09-25T23:59:00Z"), 2).toISOString()).toBe("2026-09-26T13:00:00.000Z"); // 19:59 + 2 min = 20:01 → tomorrow
  });
  it("opens with why she's calling and tells a missed call from an answered one", async () => {
    const { outboundGreeting, callWasMissed, missedCallText } = await import("./outbound");
    const g = outboundGreeting({ firstName: "Dana", reason: "shrink-wrap-quote", boat: "24 ft bowrider", total: "$672" });
    expect(g.startsWith("Hi, is this Dana? It's Marina from A1 Marine Care.")).toBe(true);
    expect(g).toContain("24 ft bowrider");
    expect(g).toContain("$672 plus tax");
    expect(outboundGreeting({ firstName: "Sam", reason: "contact", detail: 'Detailing — "how much for a 30 footer"' })).toContain("sent us a message about Detailing");
    expect(callWasMissed("dial_no_answer")).toBe("no answer");
    expect(callWasMissed("dial_busy")).toBe("no answer");
    expect(callWasMissed("voicemail_reached")).toBe("voicemail");
    expect(callWasMissed("machine_detected")).toBe("voicemail");
    expect(callWasMissed("user_hangup")).toBeNull();
    expect(callWasMissed(undefined)).toBeNull();
    const { outboundCallMissed } = await import("./outbound");
    expect(outboundCallMissed({ direction: "outbound", disconnection_reason: "agent_hangup", transcript: "User: record your name and reason for calling, I'll see if this person is available." })).toBe("no answer");
    expect(outboundCallMissed({ direction: "outbound", disconnection_reason: "agent_hangup", call_analysis: { in_voicemail: true } })).toBe("voicemail");
    expect(outboundCallMissed({ direction: "outbound", disconnection_reason: "agent_hangup", transcript: "User: Yes please book Wednesday." })).toBeNull();
    expect(outboundCallMissed({ direction: "inbound", disconnection_reason: "agent_hangup", transcript: "leave a message" })).toBeNull();
    expect(missedCallText({ firstName: "Dana", reason: "shrink-wrap-quote" })).toContain("just tried to call");
  });
});

describe("deposit session idempotency", () => {
  it("keys differ across channels for the same quote, but repeat for an exact retry", async () => {
    const { paramsFingerprint } = await import("@/lib/stripe");
    const base = { quoteId: "q1", customerName: "Dana", customerEmail: "d@x.ca", description: "Holds your date", amountCents: 25000, successUrl: "https://a/s", cancelUrl: "https://a/c", metadata: {} };
    const email = paramsFingerprint(base, { channel: "quote-email" });
    const marina = paramsFingerprint(base, { channel: "marina", retellCallId: "c1" });
    expect(email).toMatch(/^[0-9a-f]{12}$/);
    expect(email).not.toBe(marina);
    expect(paramsFingerprint(base, { channel: "quote-email" })).toBe(email);
    expect(paramsFingerprint({ ...base, customerEmail: undefined }, { channel: "quote-email" })).not.toBe(email);
  });
});
