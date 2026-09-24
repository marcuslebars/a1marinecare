import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { getDepositCents, verifyStripeWebhook } from "./stripe";

const SECRET = "whsec_test_secret";

function sign(body: string, secret = SECRET, timestamp = Math.floor(Date.now() / 1000)) {
  const v1 = createHmac("sha256", secret).update(`${timestamp}.${body}`, "utf8").digest("hex");
  return `t=${timestamp},v1=${v1}`;
}

describe("verifyStripeWebhook", () => {
  const body = JSON.stringify({ id: "evt_1", type: "checkout.session.completed", created: 1, livemode: false, data: { object: { id: "cs_1" } } });

  it("accepts a correctly signed payload", () => {
    const event = verifyStripeWebhook(body, sign(body), SECRET);
    expect(event.type).toBe("checkout.session.completed");
    expect((event.data.object as { id: string }).id).toBe("cs_1");
  });

  it("accepts when one of several v1 signatures matches (secret rotation)", () => {
    const ts = Math.floor(Date.now() / 1000);
    const good = sign(body, SECRET, ts).split(",")[1];
    const stale = sign(body, "whsec_old", ts).split(",")[1];
    expect(() => verifyStripeWebhook(body, `t=${ts},${stale},${good}`, SECRET)).not.toThrow();
  });

  it("rejects a tampered body", () => {
    expect(() => verifyStripeWebhook(body.replace("cs_1", "cs_2"), sign(body), SECRET)).toThrow(/mismatch/);
  });

  it("rejects the wrong secret", () => {
    expect(() => verifyStripeWebhook(body, sign(body), "whsec_other")).toThrow(/mismatch/);
  });

  it("rejects a replayed signature outside the tolerance window", () => {
    const old = Math.floor(Date.now() / 1000) - 600;
    expect(() => verifyStripeWebhook(body, sign(body, SECRET, old), SECRET)).toThrow(/tolerance/);
  });

  it("rejects a missing or malformed header", () => {
    expect(() => verifyStripeWebhook(body, null, SECRET)).toThrow(/Missing/);
    expect(() => verifyStripeWebhook(body, "nonsense", SECRET)).toThrow(/Malformed/);
  });
});

describe("getDepositCents", () => {
  it("defaults to $250 and ignores junk overrides", () => {
    const prev = process.env.SHRINK_WRAP_DEPOSIT_CENTS;
    delete process.env.SHRINK_WRAP_DEPOSIT_CENTS;
    expect(getDepositCents()).toBe(25_000);
    process.env.SHRINK_WRAP_DEPOSIT_CENTS = "abc";
    expect(getDepositCents()).toBe(25_000);
    process.env.SHRINK_WRAP_DEPOSIT_CENTS = "100"; // below the $50 floor
    expect(getDepositCents()).toBe(25_000);
    process.env.SHRINK_WRAP_DEPOSIT_CENTS = "30000";
    expect(getDepositCents()).toBe(30_000);
    if (prev === undefined) delete process.env.SHRINK_WRAP_DEPOSIT_CENTS;
    else process.env.SHRINK_WRAP_DEPOSIT_CENTS = prev;
  });
});
