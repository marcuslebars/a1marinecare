import { describe, expect, it } from "vitest";

import { calculateShrinkWrapQuote, formatCents, SHRINK_WRAP, winterizationCents } from "./shrink-wrap-pricing";

describe("mobile shrink wrap pricing ($28/ft, $400 min)", () => {
  it("prices a 20 ft bowrider at $560", () => {
    const q = calculateShrinkWrapQuote({ lengthFt: 20, hullType: "bowrider" });
    expect(q.subtotalCents).toBe(56000);
    expect(q.requiresManualReview).toBe(false);
  });

  it("prices 24 ft at $672 and 28 ft at $784 (the numbers in the ads)", () => {
    expect(calculateShrinkWrapQuote({ lengthFt: 24, hullType: "cruiser" }).subtotalCents).toBe(67200);
    expect(calculateShrinkWrapQuote({ lengthFt: 28, hullType: "cruiser" }).subtotalCents).toBe(78400);
  });

  it("applies the $400 minimum below 14.3 ft", () => {
    const q = calculateShrinkWrapQuote({ lengthFt: 12, hullType: "bowrider" });
    expect(q.subtotalCents).toBe(40000);
    expect(q.lineItems[0].description).toContain("minimum applies");
    // 15 ft × $28 = $420 > minimum
    expect(calculateShrinkWrapQuote({ lengthFt: 15, hullType: "bowrider" }).subtotalCents).toBe(42000);
  });

  it("adds the pontoon ($16/ft) and tritoon ($20/ft) surcharges", () => {
    const pontoon = calculateShrinkWrapQuote({ lengthFt: 22, hullType: "pontoon" });
    expect(pontoon.subtotalCents).toBe(22 * 2800 + 22 * 1600);
    const tritoon = calculateShrinkWrapQuote({ lengthFt: 22, hullType: "tritoon" });
    expect(tritoon.subtotalCents).toBe(22 * 2800 + 22 * 2000);
    expect(tritoon.lineItems.map((l) => l.key)).toEqual(["shrink_wrap", "hull_surcharge"]);
  });

  it("adds winterization by engine type with additional engines at 75%", () => {
    expect(winterizationCents("outboard", 1)).toBe(27500);
    expect(winterizationCents("sterndrive", 1)).toBe(40000);
    expect(winterizationCents("inboard", 1)).toBe(44500);
    expect(winterizationCents("sterndrive", 2)).toBe(40000 + 30000);
    expect(winterizationCents("outboard", 3)).toBe(27500 + 2 * Math.round(27500 * 0.75));

    const q = calculateShrinkWrapQuote({
      lengthFt: 24,
      hullType: "cruiser",
      winterization: { engineType: "sterndrive", engineCount: 1 },
    });
    expect(q.subtotalCents).toBe(67200 + 40000);
  });

  it("flags out-of-range boats for manual review but still returns a number", () => {
    const big = calculateShrinkWrapQuote({ lengthFt: 44, hullType: "cruiser" });
    expect(big.requiresManualReview).toBe(true);
    expect(big.reviewReasons[0]).toMatch(/over 40 ft/);
    expect(big.subtotalCents).toBe(44 * 2800);
  });

  it("formats cents like the engine", () => {
    expect(formatCents(SHRINK_WRAP.rateCents)).toBe("$28");
    expect(formatCents(40000)).toBe("$400");
    expect(formatCents(123456)).toBe("$1,234.56");
  });
});
