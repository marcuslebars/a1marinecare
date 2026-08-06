# PRICE-COPY Inventory (A1 Marine Care)

`pricing.config.json` is the single source of truth for every price the quote
**engine** charges. A handful of **display copy** strings in the UI also mention
prices. Per decision (Phase 1), the engine and the interactive quote labels are
config-driven; the items below are **intentional editorial copy** that is *not*
derived from config — either because it is a marketing range that deliberately
differs from the exact charge, or because its formatting can't be derived without
changing what the customer sees (e.g. `1.0x`, which `${1.0}x` would render as `1x`).

Each item carries a `PRICE-COPY:` marker comment in the source. **When you change
a rate in `pricing.config.json`, walk this list and eyeball each mention.**

Find every marker: `grep -rn "PRICE-COPY" src/`
Confirm no *un-marked* hardcoded dollar price exists: `grep -rnE '\$[0-9]' src/` →
should return only the rows in the "Dollar figures" table below. The guard test
`src/test/price-copy.test.ts` enforces this automatically.

> Line numbers are approximate anchors — the `PRICE-COPY:` marker is the durable
> reference. Re-run the grep above after edits.

## Dollar figures (all in `src/components/quote/LearnMoreModal.tsx`)

| ~Line | Copy | Config source | Relationship |
|------|------|---------------|--------------|
| 165 | `Arch / Radar Arch — $175` | `marine_care.services.gelcoat.addons.radarArch` = 175 | **Exact match** |
| 166 | `Hard Top — $350 – $600` | `marine_care.services.gelcoat.addons.hardTop` = 475 | **Range** — engine charges flat $475 |
| 167 | `Spot Wet Sanding — $75 – $150 per area` | `marine_care.services.gelcoat.spotWetSandingPerArea` = 125 | **Range** — engine charges $125/area |
| 168 | `Heavy Oxidation Treatment — +15% – +25% surcharge` | `marine_care.services.gelcoat.heavyOxidationSurchargePct` = 20 | **Range** — engine charges flat +20% |
| 318 | `Weekly Service is priced at $6 per foot` | `marine_care.services.weeklyMaintenance.ratePerFoot` = 6 | **Exact match** |
| 335 | `Bi-Weekly Service is priced at $7 per foot` | `marine_care.services.biweeklyMaintenance.ratePerFoot` = 7 | **Exact match** |

## Tier-multiplier labels (`1.0x` style — mirror config multipliers)

| File | ~Lines | Labels | Config source |
|------|--------|--------|---------------|
| `quote-flow.tsx` | 52–55 | 1.0x / 1.2x / 1.4x / 1.6x | `marine_care.services.exterior.tierMultipliers` |
| `quote-flow.tsx` | 60–63 | 1.0x / 1.25x / 1.5x / 1.75x | `marine_care.services.interior.tierMultipliers` |
| `LearnMoreModal.tsx` | 188–191 | 1.0x / 1.2x / 1.4x / 1.6x | `marine_care.services.exterior.tierMultipliers` |
| `LearnMoreModal.tsx` | 210–213 | 1.0x / 1.25x / 1.5x / 1.75x | `marine_care.services.interior.tierMultipliers` |

## What IS config-driven (for contrast — do not list here)

Everything else: the quote engine (`src/lib/quote-pricing.ts`), and every
interactive price label in `src/components/quote/quote-flow.tsx` (option toggles,
`$/ft` hints, maintenance rate chips, the submit payload's `ratePerFoot`) now
renders from `pricing.config.json` via the `CARE` loader. A rate change there
updates all of them automatically.
