// Golden-test input matrix for the Marine Care quote tool.
//
// This enumerates a broad, representative set of quote inputs. It is the
// "contract" for the Phase 1 refactor: the output of every case here is frozen
// into golden.fixtures.json from the CURRENT pricing code, and must remain
// byte-identical (to the cent, plus identical breakdown lines) after the tool
// is refactored to read from pricing.config.json.
//
// Cases are generated deterministically (fixed loop order, stable ids) so the
// fixture is stable across runs.

import type {
  GelcoatConfig,
  ExteriorConfig,
  InteriorConfig,
  CeramicConfig,
  GrapheneConfig,
  WetSandingConfig,
  BottomPaintingConfig,
  VinylConfig,
  ServiceSelections,
} from "@/lib/quote-pricing";

export type GoldenCase =
  | { id: string; service: "gelcoat"; length: number; config: GelcoatConfig }
  | { id: string; service: "exterior"; length: number; config: ExteriorConfig }
  | { id: string; service: "interior"; length: number; boatType: string; config: InteriorConfig }
  | { id: string; service: "ceramic"; length: number; config: CeramicConfig }
  | { id: string; service: "graphene"; length: number; config: GrapheneConfig }
  | { id: string; service: "wetSanding"; length: number; config: WetSandingConfig }
  | { id: string; service: "bottomPainting"; length: number; config: BottomPaintingConfig }
  | { id: string; service: "vinyl"; length: number; config: VinylConfig }
  | { id: string; service: "weekly"; length: number }
  | { id: string; service: "biweekly"; length: number }
  | { id: string; service: "total"; length: number; boatType: string; services: ServiceSelections };

// Representative lengths required by the brief.
const LENGTHS = [14, 16, 18, 20, 22, 24, 26, 28, 30, 34];

const BOAT_TYPES = ["bowrider", "cuddy", "cruiser", "express", "yacht", "sailboat", "pontoon", "other"];

const GELCOAT_AREAS: GelcoatConfig["area"][] = ["hull", "topsides", "fullboat", "bowrider"];
const TIERS: ExteriorConfig["tier"][] = ["refresh", "standard", "deep", "restoration"];
const VINYL_SERVICES: VinylConfig["service"][] = ["removal", "install", "both"];

const gelcoat = (area: GelcoatConfig["area"], o: Partial<GelcoatConfig> = {}): GelcoatConfig => ({
  area,
  radarArch: false,
  hardTop: false,
  spotWetSanding: 0,
  heavyOxidation: false,
  ...o,
});

const exterior = (tier: ExteriorConfig["tier"], o: Partial<ExteriorConfig> = {}): ExteriorConfig => ({
  tier,
  teakCleaning: false,
  canvasCleaning: false,
  fenderCleaning: false,
  exteriorOzone: false,
  ...o,
});

const interior = (tier: InteriorConfig["tier"], o: Partial<InteriorConfig> = {}): InteriorConfig => ({
  tier,
  moldRemediation: false,
  mattressShampoo: false,
  headDeepClean: false,
  galleyDeepClean: false,
  petHairRemoval: false,
  ozoneInterior: false,
  ...o,
});

const ceramic = (o: Partial<CeramicConfig> = {}): CeramicConfig => ({
  secondLayer: false,
  teakCeramic: false,
  interiorCeramic: false,
  ...o,
});

const graphene = (o: Partial<GrapheneConfig> = {}): GrapheneConfig => ({
  secondLayer: false,
  teakGraphene: false,
  ...o,
});

const wet = (o: Partial<WetSandingConfig> = {}): WetSandingConfig => ({
  deepScratchRepair: false,
  spotWetSanding: 0,
  ...o,
});

const bottom = (o: Partial<BottomPaintingConfig> = {}): BottomPaintingConfig => ({
  secondCoat: false,
  oldPaintRemoval: false,
  heavyGrowthRemoval: false,
  blisterRepair: false,
  ...o,
});

const vinyl = (service: VinylConfig["service"], o: Partial<VinylConfig> = {}): VinylConfig => ({
  service,
  customDesign: false,
  ...o,
});

function buildCases(): GoldenCase[] {
  const cases: GoldenCase[] = [];

  // ── Gelcoat ────────────────────────────────────────────────────────────
  for (const length of LENGTHS) {
    for (const area of GELCOAT_AREAS) {
      cases.push({ id: `gelcoat/${area}/base/L${length}`, service: "gelcoat", length, config: gelcoat(area) });
    }
  }
  // Option sweeps (curated) — verify each surcharge path.
  cases.push({ id: "gelcoat/hull/radarArch/L24", service: "gelcoat", length: 24, config: gelcoat("hull", { radarArch: true }) });
  cases.push({ id: "gelcoat/hull/hardTop/L24", service: "gelcoat", length: 24, config: gelcoat("hull", { hardTop: true }) });
  cases.push({ id: "gelcoat/hull/heavyOx/L24", service: "gelcoat", length: 24, config: gelcoat("hull", { heavyOxidation: true }) });
  cases.push({ id: "gelcoat/hull/spot2/L24", service: "gelcoat", length: 24, config: gelcoat("hull", { spotWetSanding: 2 }) });
  cases.push({ id: "gelcoat/fullboat/allOn/L30", service: "gelcoat", length: 30, config: gelcoat("fullboat", { radarArch: true, hardTop: true, heavyOxidation: true, spotWetSanding: 3 }) });
  cases.push({ id: "gelcoat/bowrider/heavyOx/L22", service: "gelcoat", length: 22, config: gelcoat("bowrider", { heavyOxidation: true }) });

  // ── Exterior ───────────────────────────────────────────────────────────
  for (const length of LENGTHS) {
    for (const tier of TIERS) {
      cases.push({ id: `exterior/${tier}/base/L${length}`, service: "exterior", length, config: exterior(tier) });
    }
  }
  cases.push({ id: "exterior/standard/teak/L20", service: "exterior", length: 20, config: exterior("standard", { teakCleaning: true }) });
  cases.push({ id: "exterior/standard/canvas/L20", service: "exterior", length: 20, config: exterior("standard", { canvasCleaning: true }) });
  cases.push({ id: "exterior/standard/fender/L20", service: "exterior", length: 20, config: exterior("standard", { fenderCleaning: true }) });
  cases.push({ id: "exterior/standard/ozone/L20", service: "exterior", length: 20, config: exterior("standard", { exteriorOzone: true }) });
  cases.push({ id: "exterior/restoration/allOn/L24", service: "exterior", length: 24, config: exterior("restoration", { teakCleaning: true, canvasCleaning: true, fenderCleaning: true, exteriorOzone: true }) });

  // ── Interior (boat-type × tier multipliers) ──────────────────────────────
  for (const length of LENGTHS) {
    for (const boatType of BOAT_TYPES) {
      cases.push({ id: `interior/${boatType}/standard/base/L${length}`, service: "interior", length, boatType, config: interior("standard") });
    }
  }
  for (const tier of TIERS) {
    cases.push({ id: `interior/cruiser/${tier}/L24`, service: "interior", length: 24, boatType: "cruiser", config: interior(tier) });
  }
  cases.push({ id: "interior/cruiser/standard/mold/L26", service: "interior", length: 26, boatType: "cruiser", config: interior("standard", { moldRemediation: true }) });
  cases.push({ id: "interior/cruiser/standard/pet/L26", service: "interior", length: 26, boatType: "cruiser", config: interior("standard", { petHairRemoval: true }) });
  cases.push({ id: "interior/cruiser/standard/mattress/L26", service: "interior", length: 26, boatType: "cruiser", config: interior("standard", { mattressShampoo: true }) });
  cases.push({ id: "interior/cruiser/standard/head/L26", service: "interior", length: 26, boatType: "cruiser", config: interior("standard", { headDeepClean: true }) });
  cases.push({ id: "interior/cruiser/standard/galley/L26", service: "interior", length: 26, boatType: "cruiser", config: interior("standard", { galleyDeepClean: true }) });
  cases.push({ id: "interior/cruiser/deep/ozone+addons/L26", service: "interior", length: 26, boatType: "cruiser", config: interior("deep", { ozoneInterior: true, moldRemediation: true, headDeepClean: true }) });
  cases.push({ id: "interior/express/deep/allAddons/L28", service: "interior", length: 28, boatType: "express", config: interior("deep", { moldRemediation: true, mattressShampoo: true, headDeepClean: true, galleyDeepClean: true, petHairRemoval: true, ozoneInterior: true }) });
  // Manual-review paths (subtotal 0, review reasons populated).
  cases.push({ id: "interior/cruiser/review-over45/L48", service: "interior", length: 48, boatType: "cruiser", config: interior("standard") });
  cases.push({ id: "interior/cruiser/review-restoration/L24", service: "interior", length: 24, boatType: "cruiser", config: interior("restoration") });
  cases.push({ id: "interior/yacht/review-deep/L30", service: "interior", length: 30, boatType: "yacht", config: interior("deep") });

  // ── Ceramic ──────────────────────────────────────────────────────────────
  for (const length of LENGTHS) {
    cases.push({ id: `ceramic/base/L${length}`, service: "ceramic", length, config: ceramic() });
  }
  cases.push({ id: "ceramic/secondLayer/L30", service: "ceramic", length: 30, config: ceramic({ secondLayer: true }) });
  cases.push({ id: "ceramic/allOn/L24", service: "ceramic", length: 24, config: ceramic({ secondLayer: true, teakCeramic: true, interiorCeramic: true }) });

  // ── Graphene ─────────────────────────────────────────────────────────────
  for (const length of LENGTHS) {
    cases.push({ id: `graphene/base/L${length}`, service: "graphene", length, config: graphene() });
  }
  cases.push({ id: "graphene/allOn/L24", service: "graphene", length: 24, config: graphene({ secondLayer: true, teakGraphene: true }) });

  // ── Wet sanding ──────────────────────────────────────────────────────────
  for (const length of LENGTHS) {
    cases.push({ id: `wetSanding/base/L${length}`, service: "wetSanding", length, config: wet() });
  }
  cases.push({ id: "wetSanding/deep+spot2/L24", service: "wetSanding", length: 24, config: wet({ deepScratchRepair: true, spotWetSanding: 2 }) });
  cases.push({ id: "wetSanding/spot3/L30", service: "wetSanding", length: 30, config: wet({ spotWetSanding: 3 }) });

  // ── Bottom painting ──────────────────────────────────────────────────────
  for (const length of LENGTHS) {
    cases.push({ id: `bottomPainting/base/L${length}`, service: "bottomPainting", length, config: bottom() });
  }
  cases.push({ id: "bottomPainting/secondCoat/L24", service: "bottomPainting", length: 24, config: bottom({ secondCoat: true }) });
  cases.push({ id: "bottomPainting/oldPaint/L24", service: "bottomPainting", length: 24, config: bottom({ oldPaintRemoval: true }) });
  cases.push({ id: "bottomPainting/heavyGrowth/L24", service: "bottomPainting", length: 24, config: bottom({ heavyGrowthRemoval: true }) });
  cases.push({ id: "bottomPainting/blister-review/L24", service: "bottomPainting", length: 24, config: bottom({ blisterRepair: true }) });
  cases.push({ id: "bottomPainting/allOn+blister/L30", service: "bottomPainting", length: 30, config: bottom({ secondCoat: true, oldPaintRemoval: true, heavyGrowthRemoval: true, blisterRepair: true }) });

  // ── Vinyl ────────────────────────────────────────────────────────────────
  for (const length of LENGTHS) {
    for (const service of VINYL_SERVICES) {
      cases.push({ id: `vinyl/${service}/base/L${length}`, service: "vinyl", length, config: vinyl(service) });
    }
  }
  cases.push({ id: "vinyl/both/customDesign/L24", service: "vinyl", length: 24, config: vinyl("both", { customDesign: true }) });

  // ── Recurring maintenance ────────────────────────────────────────────────
  for (const length of LENGTHS) {
    cases.push({ id: `weekly/L${length}`, service: "weekly", length });
  }
  for (const length of LENGTHS) {
    cases.push({ id: `biweekly/L${length}`, service: "biweekly", length });
  }

  // ── Combined (calculateTotal) scenarios ──────────────────────────────────
  cases.push({
    id: "total/ext+int+ceramic/cruiser/L30",
    service: "total",
    length: 30,
    boatType: "cruiser",
    services: { exterior: exterior("standard"), interior: interior("standard"), ceramic: ceramic() },
  });
  cases.push({
    id: "total/gelcoat-fullboat+wet+bottom/bowrider/L26",
    service: "total",
    length: 26,
    boatType: "bowrider",
    services: { gelcoat: gelcoat("fullboat"), wetSanding: wet({ deepScratchRepair: true }), bottomPainting: bottom({ secondCoat: true }) },
  });
  cases.push({
    id: "total/graphene+vinyl-both/other/L22",
    service: "total",
    length: 22,
    boatType: "other",
    services: { graphene: graphene({ secondLayer: true }), vinyl: vinyl("both", { customDesign: true }) },
  });
  cases.push({
    id: "total/weeklyOnly/pontoon/L20",
    service: "total",
    length: 20,
    boatType: "pontoon",
    services: { weeklyMaintenance: { cadence: "weekly" } },
  });
  cases.push({
    id: "total/biweeklyOnly/pontoon/L20",
    service: "total",
    length: 20,
    boatType: "pontoon",
    services: { biweeklyMaintenance: { cadence: "biweekly" } },
  });
  cases.push({
    id: "total/interior-restoration-review+exterior/cruiser/L24",
    service: "total",
    length: 24,
    boatType: "cruiser",
    services: { exterior: exterior("refresh"), interior: interior("restoration") },
  });
  cases.push({
    id: "total/gelcoat-allOn+exterior-allOn+interior-addons/express/L28",
    service: "total",
    length: 28,
    boatType: "express",
    services: {
      gelcoat: gelcoat("fullboat", { radarArch: true, hardTop: true, heavyOxidation: true, spotWetSanding: 2 }),
      exterior: exterior("deep", { teakCleaning: true, canvasCleaning: true, fenderCleaning: true, exteriorOzone: true }),
      interior: interior("standard", { moldRemediation: true, headDeepClean: true, galleyDeepClean: true }),
    },
  });
  cases.push({
    id: "total/ceramic+graphene+bottom-blister-review/yacht/L34",
    service: "total",
    length: 34,
    boatType: "yacht",
    services: { ceramic: ceramic({ secondLayer: true, teakCeramic: true }), graphene: graphene({ teakGraphene: true }), bottomPainting: bottom({ blisterRepair: true }) },
  });

  return cases;
}

export const GOLDEN_CASES: GoldenCase[] = buildCases();
