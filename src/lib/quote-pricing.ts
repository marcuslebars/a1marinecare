export interface BoatDetails {
  length: number;
  type: string;
  location: string;
}

export interface ContactInfo {
  fullName: string;
  email: string;
  phone: string;
}

export interface GelcoatConfig {
  area: "hull" | "topsides" | "bowrider" | "fullboat";
  radarArch: boolean;
  hardTop: boolean;
  spotWetSanding: number;
  heavyOxidation: boolean;
}

export interface ExteriorConfig {
  tier: "refresh" | "standard" | "deep" | "restoration";
  teakCleaning: boolean;
  canvasCleaning: boolean;
  fenderCleaning: boolean;
  exteriorOzone: boolean;
}

export interface InteriorConfig {
  tier: "refresh" | "standard" | "deep" | "restoration";
  moldRemediation: boolean;
  mattressShampoo: boolean;
  headDeepClean: boolean;
  galleyDeepClean: boolean;
  petHairRemoval: boolean;
  ozoneInterior: boolean;
  photos?: File[];
  photoConfirmation?: boolean;
}

export interface CeramicConfig {
  secondLayer: boolean;
  teakCeramic: boolean;
  interiorCeramic: boolean;
}

export interface GrapheneConfig {
  secondLayer: boolean;
  teakGraphene: boolean;
}

export interface WetSandingConfig {
  deepScratchRepair: boolean;
  spotWetSanding: number;
}

export interface BottomPaintingConfig {
  secondCoat: boolean;
  oldPaintRemoval: boolean;
  heavyGrowthRemoval: boolean;
  blisterRepair: boolean;
}

export interface VinylConfig {
  service: "removal" | "install" | "both";
  customDesign: boolean;
}

export interface MaintenancePlanConfig {
  cadence: "weekly" | "biweekly";
}

export interface ServiceSelections {
  gelcoat?: GelcoatConfig;
  exterior?: ExteriorConfig;
  interior?: InteriorConfig;
  ceramic?: CeramicConfig;
  graphene?: GrapheneConfig;
  wetSanding?: WetSandingConfig;
  bottomPainting?: BottomPaintingConfig;
  vinyl?: VinylConfig;
  weeklyMaintenance?: MaintenancePlanConfig;
  biweeklyMaintenance?: MaintenancePlanConfig;
}

export interface PricingResult {
  subtotal: number;
  breakdown: string[];
  requiresManualReview: boolean;
  reviewReasons: string[];
}

export const SERVICE_STARTING_RATE_BY_SLUG = {
  "boat-detailing": 20,
  "gelcoat-restoration": 21,
  "ceramic-coating": 35,
  "interior-detailing": 18,
  "graphene-coating": 40,
  "wet-sanding": 45,
  "bottom-painting": 40,
  "vinyl-removal": 12,
  "weekly-maintenance-plan": 6,
  "bi-weekly-maintenance-plan": 7,
} as const;

export function getServiceStartingRateBySlug(slug: string): number | null {
  return SERVICE_STARTING_RATE_BY_SLUG[slug as keyof typeof SERVICE_STARTING_RATE_BY_SLUG] ?? null;
}

export function getServiceStartingPriceLabel(slug: string): string {
  const rate = getServiceStartingRateBySlug(slug);
  return rate === null ? "Custom quote" : `From $${rate}/ft`;
}

const GELCOAT_RATES = {
  hull: [
    { max: 20, rate: 21 },
    { max: 25, rate: 23 },
    { max: 30, rate: 25 },
    { max: 35, rate: 27 },
    { max: 40, rate: 30 },
    { max: 45, rate: 34 },
    { max: Infinity, rate: 36 },
  ],
  topsides: [
    { max: 20, rate: 24 },
    { max: 25, rate: 26 },
    { max: 30, rate: 28 },
    { max: 35, rate: 31 },
    { max: 40, rate: 34 },
    { max: 45, rate: 37 },
    { max: Infinity, rate: 40 },
  ],
} as const;

const TIER_MULTIPLIERS = {
  refresh: 1.0,
  standard: 1.2,
  deep: 1.4,
  restoration: 1.6,
} as const;

const INTERIOR_TIER_MULTIPLIERS = {
  refresh: 1.0,
  standard: 1.25,
  deep: 1.5,
  restoration: 1.75,
} as const;

const INTERIOR_BOAT_TYPE_MULTIPLIERS: Record<string, number> = {
  "Open Bow / Bowrider": 1.0,
  "Cuddy Cabin": 1.1,
  "Cruiser (Single Cabin)": 1.25,
  "Express Cruiser": 1.35,
  "Yacht / Multi-Cabin": 1.6,
};

function getBoatTypeDisplayName(shortValue: string): string {
  const mapping: Record<string, string> = {
    bowrider: "Open Bow / Bowrider",
    cuddy: "Cuddy Cabin",
    cruiser: "Cruiser (Single Cabin)",
    express: "Express Cruiser",
    yacht: "Yacht / Multi-Cabin",
    sailboat: "Sailboat",
    pontoon: "Pontoon",
    other: "Other",
  };

  return mapping[shortValue.toLowerCase()] || shortValue;
}

function getGelcoatRate(length: number, area: "hull" | "topsides"): number {
  const rates = GELCOAT_RATES[area];

  for (const tier of rates) {
    if (length <= tier.max) {
      return tier.rate;
    }
  }

  return rates[rates.length - 1].rate;
}

export function calculateGelcoat(length: number, config: GelcoatConfig): PricingResult {
  const breakdown: string[] = [];
  const reviewReasons: string[] = [];
  let subtotal = 0;
  let baseServiceSubtotal = 0;

  const hullRate = getGelcoatRate(length, "hull");
  const topsidesRate = getGelcoatRate(length, "topsides");

  if (config.area === "hull") {
    const hullPrice = length * hullRate;
    breakdown.push(`Hull: ${length}ft × $${hullRate}/ft = $${hullPrice.toFixed(2)}`);
    baseServiceSubtotal = hullPrice;
  } else if (config.area === "topsides") {
    const topsidesPrice = length * topsidesRate;
    breakdown.push(`Topsides: ${length}ft × $${topsidesRate}/ft = $${topsidesPrice.toFixed(2)}`);
    baseServiceSubtotal = topsidesPrice;
  } else if (config.area === "fullboat") {
    const hullPrice = length * hullRate;
    const topsidesPrice = length * topsidesRate;
    breakdown.push(`Hull: ${length}ft × $${hullRate}/ft = $${hullPrice.toFixed(2)}`);
    breakdown.push(`Topsides: ${length}ft × $${topsidesRate}/ft = $${topsidesPrice.toFixed(2)}`);
    baseServiceSubtotal = hullPrice + topsidesPrice;
  } else if (config.area === "bowrider") {
    const hullPrice = length * hullRate;
    const adjustedTopsidesPrice = length * topsidesRate * 0.6;
    breakdown.push(`Hull: ${length}ft × $${hullRate}/ft = $${hullPrice.toFixed(2)}`);
    breakdown.push(
      `Topsides (Bowrider 40% reduction): ${length}ft × $${topsidesRate}/ft × 0.6 = $${adjustedTopsidesPrice.toFixed(2)}`,
    );
    baseServiceSubtotal = hullPrice + adjustedTopsidesPrice;
  }

  let oxidationCharge = 0;
  if (config.heavyOxidation) {
    oxidationCharge = baseServiceSubtotal * 0.2;
    breakdown.push(`Heavy Oxidation Surcharge (+20%): $${oxidationCharge.toFixed(2)}`);
  }

  subtotal = baseServiceSubtotal + oxidationCharge;

  if (config.radarArch) {
    subtotal += 175;
    breakdown.push("Arch / Radar Arch: $175.00");
  }

  if (config.hardTop) {
    subtotal += 475;
    breakdown.push("Hard Top: $475.00");
  }

  if (config.spotWetSanding > 0) {
    const sandingCost = config.spotWetSanding * 125;
    subtotal += sandingCost;
    breakdown.push(`Spot Wet Sanding (${config.spotWetSanding} areas): $${sandingCost.toFixed(2)}`);
  }

  return {
    subtotal,
    breakdown,
    requiresManualReview: reviewReasons.length > 0,
    reviewReasons,
  };
}

export function calculateExterior(length: number, config: ExteriorConfig): PricingResult {
  const breakdown: string[] = [];
  let subtotal = 0;

  const baseRate = 20;
  const multiplier = TIER_MULTIPLIERS[config.tier];
  const basePrice = length * baseRate * multiplier;

  breakdown.push(
    `Exterior ${config.tier.charAt(0).toUpperCase() + config.tier.slice(1)}: ${length}ft × $${baseRate}/ft × ${multiplier} = $${basePrice.toFixed(2)}`,
  );
  subtotal = basePrice;

  if (config.teakCleaning) {
    subtotal += 225;
    breakdown.push("Teak Cleaning: $225.00");
  }

  if (config.canvasCleaning) {
    subtotal += 150;
    breakdown.push("Canvas Cleaning: $150.00");
  }

  if (config.fenderCleaning) {
    subtotal += 60;
    breakdown.push("Fender Cleaning: $60.00");
  }

  if (config.exteriorOzone) {
    subtotal += 100;
    breakdown.push("Exterior Ozone: $100.00");
  }

  return { subtotal, breakdown, requiresManualReview: false, reviewReasons: [] };
}

export function calculateInterior(length: number, boatType: string, config: InteriorConfig): PricingResult {
  const breakdown: string[] = [];
  const reviewReasons: string[] = [];
  let subtotal = 0;

  const boatTypeDisplay = getBoatTypeDisplayName(boatType);

  if (length > 45) {
    reviewReasons.push("Boat over 45ft requires manual review");
  }

  if (config.tier === "restoration") {
    reviewReasons.push("Restoration tier requires manual review");
  }

  if (boatTypeDisplay === "Yacht / Multi-Cabin" && (config.tier === "deep" || config.tier === "restoration")) {
    reviewReasons.push("Yacht with Deep Clean or Restoration requires manual review");
  }

  if (reviewReasons.length > 0) {
    return { subtotal: 0, breakdown, requiresManualReview: true, reviewReasons };
  }

  const baseRate = 18;
  const tierMultiplier = INTERIOR_TIER_MULTIPLIERS[config.tier];
  const boatTypeMultiplier = INTERIOR_BOAT_TYPE_MULTIPLIERS[boatTypeDisplay] || 1.0;
  const calculatedBase = length * baseRate * boatTypeMultiplier * tierMultiplier;

  let interiorAddOnsTotal = 0;

  if (config.moldRemediation) {
    interiorAddOnsTotal += 295;
    breakdown.push("Advanced Mold & Mildew Remediation: $295.00");
  }

  if (config.petHairRemoval) {
    interiorAddOnsTotal += 150;
    breakdown.push("Heavy Pet Hair Removal: $150.00");
  }

  if (config.mattressShampoo) {
    interiorAddOnsTotal += 175;
    breakdown.push("Cabin Mattress / Cushion Shampoo: $175.00");
  }

  if (config.headDeepClean) {
    interiorAddOnsTotal += 125;
    breakdown.push("Head (Bathroom) Deep Clean: $125.00");
  }

  if (config.galleyDeepClean) {
    interiorAddOnsTotal += 175;
    breakdown.push("Galley Deep Clean: $175.00");
  }

  if (config.ozoneInterior) {
    interiorAddOnsTotal += 195;
    breakdown.push("Ozone Odor Treatment: $195.00");
  }

  const lowEstimate = calculatedBase * 0.85 + interiorAddOnsTotal;
  const highEstimate = calculatedBase * 1.15 + interiorAddOnsTotal;

  breakdown.unshift(
    `Interior ${config.tier.charAt(0).toUpperCase() + config.tier.slice(1)} (${boatTypeDisplay}): $${lowEstimate.toFixed(0)} – $${highEstimate.toFixed(0)}`,
  );

  subtotal = calculatedBase + interiorAddOnsTotal;

  return { subtotal, breakdown, requiresManualReview: false, reviewReasons: [] };
}

export function calculateCeramic(length: number, config: CeramicConfig): PricingResult {
  const breakdown: string[] = [];
  let subtotal = 0;

  const basePrice = length * 35;
  breakdown.push(`Ceramic Coating: ${length}ft × $35/ft = $${basePrice.toFixed(2)}`);
  subtotal = basePrice;

  if (config.secondLayer) {
    const secondLayerCost = length * 8;
    subtotal += secondLayerCost;
    breakdown.push(`Second Layer: ${length}ft × $8/ft = $${secondLayerCost.toFixed(2)}`);
  }

  if (config.teakCeramic) {
    subtotal += 300;
    breakdown.push("Teak Ceramic: $300.00");
  }

  if (config.interiorCeramic) {
    subtotal += 150;
    breakdown.push("Interior Ceramic: $150.00");
  }

  return { subtotal, breakdown, requiresManualReview: false, reviewReasons: [] };
}

export function calculateGraphene(length: number, config: GrapheneConfig): PricingResult {
  const breakdown: string[] = [];
  let subtotal = 0;

  const basePrice = length * 40;
  breakdown.push(`Graphene Coating: ${length}ft × $40/ft = $${basePrice.toFixed(2)}`);
  subtotal = basePrice;

  if (config.secondLayer) {
    const secondLayerCost = length * 10;
    subtotal += secondLayerCost;
    breakdown.push(`Second Layer: ${length}ft × $10/ft = $${secondLayerCost.toFixed(2)}`);
  }

  if (config.teakGraphene) {
    subtotal += 350;
    breakdown.push("Teak Graphene: $350.00");
  }

  return { subtotal, breakdown, requiresManualReview: false, reviewReasons: [] };
}

export function calculateWetSanding(length: number, config: WetSandingConfig): PricingResult {
  const breakdown: string[] = [];
  let subtotal = 0;

  const basePrice = length * 45;
  breakdown.push(`Wet Sanding & Paint/Gelcoat Correction: ${length}ft × $45/ft = $${basePrice.toFixed(2)}`);
  subtotal = basePrice;

  if (config.deepScratchRepair) {
    subtotal += 275;
    breakdown.push("Deep Scratch Repair: $275.00");
  }

  if (config.spotWetSanding > 0) {
    const sandingCost = config.spotWetSanding * 125;
    subtotal += sandingCost;
    breakdown.push(`Spot Wet Sanding (${config.spotWetSanding} areas): $${sandingCost.toFixed(2)}`);
  }

  return { subtotal, breakdown, requiresManualReview: false, reviewReasons: [] };
}

export function calculateBottomPainting(length: number, config: BottomPaintingConfig): PricingResult {
  const breakdown: string[] = [];
  const reviewReasons: string[] = [];
  let subtotal = 0;

  const basePrice = length * 40;
  breakdown.push(`Bottom Painting: ${length}ft × $40/ft = $${basePrice.toFixed(2)}`);
  subtotal = basePrice;

  if (config.secondCoat) {
    const secondCoatCost = length * 12;
    subtotal += secondCoatCost;
    breakdown.push(`2nd Coat: ${length}ft × $12/ft = $${secondCoatCost.toFixed(2)}`);
  }

  if (config.oldPaintRemoval) {
    const removalCost = length * 18;
    subtotal += removalCost;
    breakdown.push(`Old Paint Removal: ${length}ft × $18/ft = $${removalCost.toFixed(2)}`);
  }

  if (config.heavyGrowthRemoval) {
    subtotal += 250;
    breakdown.push("Heavy Growth Removal: $250.00");
  }

  if (config.blisterRepair) {
    reviewReasons.push("Blister repair requires manual review");
  }

  return {
    subtotal,
    breakdown,
    requiresManualReview: config.blisterRepair,
    reviewReasons,
  };
}

export function calculateVinyl(length: number, config: VinylConfig): PricingResult {
  const breakdown: string[] = [];
  let subtotal = 0;

  const rates = {
    removal: 12,
    install: 15,
    both: 24,
  } as const;

  const basePrice = length * rates[config.service];
  const serviceName =
    config.service === "both" ? "Removal + Install" : config.service === "removal" ? "Removal Only" : "Install Only";

  breakdown.push(`Vinyl ${serviceName}: ${length}ft × $${rates[config.service]}/ft = $${basePrice.toFixed(2)}`);
  subtotal = basePrice;

  if (config.customDesign) {
    subtotal += 125;
    breakdown.push("Custom Design: $125.00");
  }

  return { subtotal, breakdown, requiresManualReview: false, reviewReasons: [] };
}

export function calculateWeeklyMaintenance(length: number): PricingResult {
  const subtotal = length * 6;
  return {
    subtotal,
    breakdown: [
      `Weekly Service: ${length}ft × $6/ft = $${subtotal.toFixed(2)}`,
      "Includes: pressure wash, wipe down, chrome polish, and window cleaning.",
    ],
    requiresManualReview: false,
    reviewReasons: [],
  };
}

export function calculateBiweeklyMaintenance(length: number): PricingResult {
  const subtotal = length * 7;
  return {
    subtotal,
    breakdown: [
      `Bi-Weekly Service: ${length}ft × $7/ft = $${subtotal.toFixed(2)}`,
      "Includes: pressure wash, wipe down, chrome polish, and window cleaning.",
    ],
    requiresManualReview: false,
    reviewReasons: [],
  };
}

export function calculateTotal(length: number, boatType: string, services: ServiceSelections): PricingResult {
  let grandTotal = 0;
  const allBreakdown: string[] = [];
  const allReviewReasons: string[] = [];
  let requiresReview = false;

  if (services.gelcoat) {
    const result = calculateGelcoat(length, services.gelcoat);
    grandTotal += result.subtotal;
    allBreakdown.push("--- Gelcoat Restoration ---", ...result.breakdown);
    if (result.requiresManualReview) {
      requiresReview = true;
      allReviewReasons.push(...result.reviewReasons);
    }
  }

  if (services.exterior) {
    const result = calculateExterior(length, services.exterior);
    grandTotal += result.subtotal;
    allBreakdown.push("--- Exterior Detailing ---", ...result.breakdown);
  }

  if (services.interior) {
    const result = calculateInterior(length, boatType, services.interior);
    grandTotal += result.subtotal;
    allBreakdown.push("--- Interior Detailing ---", ...result.breakdown);
    if (result.requiresManualReview) {
      requiresReview = true;
      allReviewReasons.push(...result.reviewReasons);
    }
  }

  if (services.ceramic) {
    const result = calculateCeramic(length, services.ceramic);
    grandTotal += result.subtotal;
    allBreakdown.push("--- Ceramic Coating ---", ...result.breakdown);
  }

  if (services.graphene) {
    const result = calculateGraphene(length, services.graphene);
    grandTotal += result.subtotal;
    allBreakdown.push("--- Graphene Coating ---", ...result.breakdown);
  }

  if (services.wetSanding) {
    const result = calculateWetSanding(length, services.wetSanding);
    grandTotal += result.subtotal;
    allBreakdown.push("--- Wet Sanding & Paint/Gelcoat Correction ---", ...result.breakdown);
  }

  if (services.bottomPainting) {
    const result = calculateBottomPainting(length, services.bottomPainting);
    grandTotal += result.subtotal;
    allBreakdown.push("--- Bottom Painting ---", ...result.breakdown);
    if (result.requiresManualReview) {
      requiresReview = true;
      allReviewReasons.push(...result.reviewReasons);
    }
  }

  if (services.vinyl) {
    const result = calculateVinyl(length, services.vinyl);
    grandTotal += result.subtotal;
    allBreakdown.push("--- Vinyl Services ---", ...result.breakdown);
  }

  if (services.weeklyMaintenance) {
    const result = calculateWeeklyMaintenance(length);
    grandTotal += result.subtotal;
    allBreakdown.push("--- Weekly Service ---", ...result.breakdown);
  }

  if (services.biweeklyMaintenance) {
    const result = calculateBiweeklyMaintenance(length);
    grandTotal += result.subtotal;
    allBreakdown.push("--- Bi-Weekly Service ---", ...result.breakdown);
  }

  return {
    subtotal: grandTotal,
    breakdown: allBreakdown,
    requiresManualReview: requiresReview,
    reviewReasons: allReviewReasons,
  };
}
