// Guard for acceptance criterion #2: the quote ENGINE and every interactive
// price label are config-driven, and the only remaining hardcoded price copy is
// the intentional editorial set documented in PRICE-COPY-INVENTORY.md.
//
// This test fails if someone re-introduces a hardcoded dollar price into the
// interactive quote tool, or adds a new hardcoded dollar mention to the Learn
// More modal without adding it to the allow-list here (and the inventory).

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf-8");

const QUOTE_FLOW = "src/components/quote/quote-flow.tsx";
const LEARN_MORE = "src/components/quote/LearnMoreModal.tsx";

// The complete, intentional editorial dollar mentions (see PRICE-COPY-INVENTORY.md).
// Every `$<digit>` line in the Learn More modal must contain one of these.
const ALLOWED_EDITORIAL_DOLLARS = ["$175", "$350", "$75", "$6 per foot", "$7 per foot"];

const dollarLines = (src: string) =>
  src.split("\n").filter((line) => /\$[0-9]/.test(line));

describe("PRICE-COPY: interactive quote labels are config-driven", () => {
  it("quote-flow.tsx contains no hardcoded dollar price", () => {
    // All dollar/per-foot labels are `${CARE...}` templates, so no `$<digit>`
    // literal should survive.
    expect(dollarLines(read(QUOTE_FLOW))).toEqual([]);
  });

  it("quote-flow.tsx has no hardcoded maintenance rate in the submit payload", () => {
    expect(/ratePerFoot:\s*[0-9]/.test(read(QUOTE_FLOW))).toBe(false);
  });
});

describe("PRICE-COPY: editorial copy is limited to the documented allow-list", () => {
  it("every $<digit> in the Learn More modal is an allow-listed editorial mention", () => {
    const offenders = dollarLines(read(LEARN_MORE)).filter(
      (line) => !ALLOWED_EDITORIAL_DOLLARS.some((frag) => line.includes(frag)),
    );
    expect(offenders).toEqual([]);
  });

  it("intentional editorial mentions are marked with PRICE-COPY", () => {
    const quoteFlow = read(QUOTE_FLOW);
    const learnMore = read(LEARN_MORE);
    // Tier-multiplier labels in the interactive tool.
    expect((quoteFlow.match(/PRICE-COPY/g) ?? []).length).toBeGreaterThanOrEqual(2);
    // Add-on ranges, tier multipliers, and maintenance notes in the modal.
    expect((learnMore.match(/PRICE-COPY/g) ?? []).length).toBeGreaterThanOrEqual(5);
  });
});
