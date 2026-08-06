// Golden test — enforces that the Marine Care quote tool is byte-identical from
// a customer's perspective before and after the Phase 1 config refactor.
//
//   Generate/refresh the frozen baseline (only with explicit sign-off):
//     GEN_GOLDEN=1 npx vitest run src/test/golden
//
//   Verify (default — what CI and every normal run does):
//     npx vitest run src/test/golden
//
// The comparison bar: subtotal equal to the cent, breakdown lines identical
// string-for-string, and the manual-review flag/reasons identical.

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { GOLDEN_CASES } from "./matrix";
import { computeCase, serializeResult, toCents, type SerializedResult } from "./run-cases";

// Resolved from the repo root (vitest's cwd) rather than import.meta.url, which
// is not a file: URL under the jsdom test environment.
const FIXTURE_PATH = path.join(process.cwd(), "src", "test", "golden", "golden.fixtures.json");

if (process.env.GEN_GOLDEN) {
  describe("golden fixtures — GENERATE", () => {
    it("freezes current pricing output as the baseline", () => {
      const out: Record<string, SerializedResult> = {};
      for (const c of GOLDEN_CASES) {
        if (out[c.id]) throw new Error(`Duplicate golden case id: ${c.id}`);
        out[c.id] = serializeResult(computeCase(c));
      }
      fs.writeFileSync(FIXTURE_PATH, `${JSON.stringify(out, null, 2)}\n`, "utf-8");
      expect(Object.keys(out).length).toBe(GOLDEN_CASES.length);
    });
  });
} else {
  const fixture: Record<string, SerializedResult> = JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf-8"));

  describe("golden — Marine Care pricing is unchanged (byte-identical to the cent)", () => {
    it("matrix and fixture cover exactly the same cases", () => {
      const caseIds = GOLDEN_CASES.map((c) => c.id).sort();
      const fixtureIds = Object.keys(fixture).sort();
      expect(caseIds).toEqual(fixtureIds);
    });

    for (const c of GOLDEN_CASES) {
      it(c.id, () => {
        const got = serializeResult(computeCase(c));
        const want = fixture[c.id];
        expect(want, `no frozen fixture for case ${c.id}`).toBeDefined();
        // Money: equal to the cent.
        expect(toCents(got.subtotal)).toBe(toCents(want.subtotal));
        // Customer-visible breakdown: identical string-for-string.
        expect(got.breakdown).toEqual(want.breakdown);
        // Manual-review behaviour: identical.
        expect(got.requiresManualReview).toBe(want.requiresManualReview);
        expect(got.reviewReasons).toEqual(want.reviewReasons);
      });
    }
  });
}
