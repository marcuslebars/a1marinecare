// Typed loader for the shared pricing config. Isolates the JSON import to one
// place and exposes a clean, well-typed `CARE` accessor for the Marine Care
// calculation module. The Marine Care site consumes the marine_care + coatings
// service lines; the storage line is consumed by the Marine Storage site.
//
// NOTE: marine_care/coatings amounts are whole CAD dollars (matching the live
// tool's exact values). The storage line is integer cents and is not consumed
// here — it is served to the Marine Storage site in Phase 3.

import rawConfig from "../../pricing.config.json";

export interface GelcoatBand {
  maxFt: number | null;
  rate: number;
}

export interface CareGelcoat {
  label: string;
  rateBands: { hull: GelcoatBand[]; topsides: GelcoatBand[] };
  bowriderTopsidesFactor: number;
  heavyOxidationSurchargePct: number;
  addons: { radarArch: number; hardTop: number };
  spotWetSandingPerArea: number;
}

export interface CareExterior {
  label: string;
  baseRatePerFoot: number;
  tierMultipliers: Record<string, number>;
  addons: { teakCleaning: number; canvasCleaning: number; fenderCleaning: number; exteriorOzone: number };
}

export interface CareInterior {
  label: string;
  baseRatePerFoot: number;
  tierMultipliers: Record<string, number>;
  boatTypeMultipliers: Record<string, number>;
  estimateRange: { low: number; high: number };
  addons: {
    moldRemediation: number;
    petHairRemoval: number;
    mattressShampoo: number;
    headDeepClean: number;
    galleyDeepClean: number;
    ozoneInterior: number;
  };
  manualReview: { maxLengthFt: number };
}

export interface CareWetSanding {
  label: string;
  baseRatePerFoot: number;
  addons: { deepScratchRepair: number };
  spotWetSandingPerArea: number;
}

export interface CareBottomPainting {
  label: string;
  baseRatePerFoot: number;
  perFootAddons: { secondCoat: number; oldPaintRemoval: number };
  addons: { heavyGrowthRemoval: number };
}

export interface CareVinyl {
  label: string;
  ratesPerFoot: { removal: number; install: number; both: number };
  addons: { customDesign: number };
}

export interface CareCeramic {
  label: string;
  baseRatePerFoot: number;
  perFootAddons: { secondLayer: number };
  addons: { teakCeramic: number; interiorCeramic: number };
}

export interface CareGraphene {
  label: string;
  baseRatePerFoot: number;
  perFootAddons: { secondLayer: number };
  addons: { teakGraphene: number };
}

export interface CareMaintenance {
  label: string;
  ratePerFoot: number;
}

const config = rawConfig as unknown as {
  marine_care: {
    startingRatesBySlug: Record<string, number>;
    services: {
      gelcoat: CareGelcoat;
      exterior: CareExterior;
      interior: CareInterior;
      wetSanding: CareWetSanding;
      bottomPainting: CareBottomPainting;
      vinyl: CareVinyl;
      weeklyMaintenance: CareMaintenance;
      biweeklyMaintenance: CareMaintenance;
    };
  };
  coatings: {
    services: {
      ceramic: CareCeramic;
      graphene: CareGraphene;
    };
  };
};

/** Flat, typed view of every price the Marine Care quote tool needs. */
export const CARE = {
  startingRatesBySlug: config.marine_care.startingRatesBySlug,
  gelcoat: config.marine_care.services.gelcoat,
  exterior: config.marine_care.services.exterior,
  interior: config.marine_care.services.interior,
  wetSanding: config.marine_care.services.wetSanding,
  bottomPainting: config.marine_care.services.bottomPainting,
  vinyl: config.marine_care.services.vinyl,
  weeklyMaintenance: config.marine_care.services.weeklyMaintenance,
  biweeklyMaintenance: config.marine_care.services.biweeklyMaintenance,
  ceramic: config.coatings.services.ceramic,
  graphene: config.coatings.services.graphene,
} as const;
