import { CARE } from "./pricing-config";

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

// All prices are sourced from pricing.config.json via the CARE loader — this
// module holds the formulas and the customer-facing breakdown copy only.
export const SERVICE_STARTING_RATE_BY_SLUG: Record<string, number> = CARE.startingRatesBySlug;

export function getServiceStartingRateBySlug(slug: string): number | null {
  return SERVICE_STARTING_RATE_BY_SLUG[slug] ?? null;
}

export function getServiceStartingPriceLabel(slug: string): string {
  const rate = getServiceStartingRateBySlug(slug);
  return rate === null ? "Custom quote" : `From $${rate}/ft`;
}

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
  const bands = CARE.gelcoat.rateBands[area];

  for (const band of bands) {
    if (band.maxFt === null || length <= band.maxFt) {
      return band.rate;
    }
  }

  return bands[bands.length - 1].rate;
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
    const adjustedTopsidesPrice = length * topsidesRate * CARE.gelcoat.bowriderTopsidesFactor;
    breakdown.push(`Hull: ${length}ft × $${hullRate}/ft = $${hullPrice.toFixed(2)}`);
    breakdown.push(
      `Topsides (Bowrider 40% reduction): ${length}ft × $${topsidesRate}/ft × ${CARE.gelcoat.bowriderTopsidesFactor} = $${adjustedTopsidesPrice.toFixed(2)}`,
    );
    baseServiceSubtotal = hullPrice + adjustedTopsidesPrice;
  }

  let oxidationCharge = 0;
  if (config.heavyOxidation) {
    oxidationCharge = baseServiceSubtotal * (CARE.gelcoat.heavyOxidationSurchargePct / 100);
    breakdown.push(`Heavy Oxidation Surcharge (+${CARE.gelcoat.heavyOxidationSurchargePct}%): $${oxidationCharge.toFixed(2)}`);
  }

  subtotal = baseServiceSubtotal + oxidationCharge;

  if (config.radarArch) {
    subtotal += CARE.gelcoat.addons.radarArch;
    breakdown.push(`Arch / Radar Arch: $${CARE.gelcoat.addons.radarArch.toFixed(2)}`);
  }

  if (config.hardTop) {
    subtotal += CARE.gelcoat.addons.hardTop;
    breakdown.push(`Hard Top: $${CARE.gelcoat.addons.hardTop.toFixed(2)}`);
  }

  if (config.spotWetSanding > 0) {
    const sandingCost = config.spotWetSanding * CARE.gelcoat.spotWetSandingPerArea;
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

  const baseRate = CARE.exterior.baseRatePerFoot;
  const multiplier = CARE.exterior.tierMultipliers[config.tier];
  const basePrice = length * baseRate * multiplier;

  breakdown.push(
    `Exterior ${config.tier.charAt(0).toUpperCase() + config.tier.slice(1)}: ${length}ft × $${baseRate}/ft × ${multiplier} = $${basePrice.toFixed(2)}`,
  );
  subtotal = basePrice;

  if (config.teakCleaning) {
    subtotal += CARE.exterior.addons.teakCleaning;
    breakdown.push(`Teak Cleaning: $${CARE.exterior.addons.teakCleaning.toFixed(2)}`);
  }

  if (config.canvasCleaning) {
    subtotal += CARE.exterior.addons.canvasCleaning;
    breakdown.push(`Canvas Cleaning: $${CARE.exterior.addons.canvasCleaning.toFixed(2)}`);
  }

  if (config.fenderCleaning) {
    subtotal += CARE.exterior.addons.fenderCleaning;
    breakdown.push(`Fender Cleaning: $${CARE.exterior.addons.fenderCleaning.toFixed(2)}`);
  }

  if (config.exteriorOzone) {
    subtotal += CARE.exterior.addons.exteriorOzone;
    breakdown.push(`Exterior Ozone: $${CARE.exterior.addons.exteriorOzone.toFixed(2)}`);
  }

  return { subtotal, breakdown, requiresManualReview: false, reviewReasons: [] };
}

export function calculateInterior(length: number, boatType: string, config: InteriorConfig): PricingResult {
  const breakdown: string[] = [];
  const reviewReasons: string[] = [];
  let subtotal = 0;

  const boatTypeDisplay = getBoatTypeDisplayName(boatType);

  if (length > CARE.interior.manualReview.maxLengthFt) {
    reviewReasons.push(`Boat over ${CARE.interior.manualReview.maxLengthFt}ft requires manual review`);
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

  const baseRate = CARE.interior.baseRatePerFoot;
  const tierMultiplier = CARE.interior.tierMultipliers[config.tier];
  const boatTypeMultiplier = CARE.interior.boatTypeMultipliers[boatTypeDisplay] || 1.0;
  const calculatedBase = length * baseRate * boatTypeMultiplier * tierMultiplier;

  let interiorAddOnsTotal = 0;

  if (config.moldRemediation) {
    interiorAddOnsTotal += CARE.interior.addons.moldRemediation;
    breakdown.push(`Advanced Mold & Mildew Remediation: $${CARE.interior.addons.moldRemediation.toFixed(2)}`);
  }

  if (config.petHairRemoval) {
    interiorAddOnsTotal += CARE.interior.addons.petHairRemoval;
    breakdown.push(`Heavy Pet Hair Removal: $${CARE.interior.addons.petHairRemoval.toFixed(2)}`);
  }

  if (config.mattressShampoo) {
    interiorAddOnsTotal += CARE.interior.addons.mattressShampoo;
    breakdown.push(`Cabin Mattress / Cushion Shampoo: $${CARE.interior.addons.mattressShampoo.toFixed(2)}`);
  }

  if (config.headDeepClean) {
    interiorAddOnsTotal += CARE.interior.addons.headDeepClean;
    breakdown.push(`Head (Bathroom) Deep Clean: $${CARE.interior.addons.headDeepClean.toFixed(2)}`);
  }

  if (config.galleyDeepClean) {
    interiorAddOnsTotal += CARE.interior.addons.galleyDeepClean;
    breakdown.push(`Galley Deep Clean: $${CARE.interior.addons.galleyDeepClean.toFixed(2)}`);
  }

  if (config.ozoneInterior) {
    interiorAddOnsTotal += CARE.interior.addons.ozoneInterior;
    breakdown.push(`Ozone Odor Treatment: $${CARE.interior.addons.ozoneInterior.toFixed(2)}`);
  }

  const lowEstimate = calculatedBase * CARE.interior.estimateRange.low + interiorAddOnsTotal;
  const highEstimate = calculatedBase * CARE.interior.estimateRange.high + interiorAddOnsTotal;

  breakdown.unshift(
    `Interior ${config.tier.charAt(0).toUpperCase() + config.tier.slice(1)} (${boatTypeDisplay}): $${lowEstimate.toFixed(0)} – $${highEstimate.toFixed(0)}`,
  );

  subtotal = calculatedBase + interiorAddOnsTotal;

  return { subtotal, breakdown, requiresManualReview: false, reviewReasons: [] };
}

export function calculateCeramic(length: number, config: CeramicConfig): PricingResult {
  const breakdown: string[] = [];
  let subtotal = 0;

  const basePrice = length * CARE.ceramic.baseRatePerFoot;
  breakdown.push(`Ceramic Coating: ${length}ft × $${CARE.ceramic.baseRatePerFoot}/ft = $${basePrice.toFixed(2)}`);
  subtotal = basePrice;

  if (config.secondLayer) {
    const secondLayerCost = length * CARE.ceramic.perFootAddons.secondLayer;
    subtotal += secondLayerCost;
    breakdown.push(`Second Layer: ${length}ft × $${CARE.ceramic.perFootAddons.secondLayer}/ft = $${secondLayerCost.toFixed(2)}`);
  }

  if (config.teakCeramic) {
    subtotal += CARE.ceramic.addons.teakCeramic;
    breakdown.push(`Teak Ceramic: $${CARE.ceramic.addons.teakCeramic.toFixed(2)}`);
  }

  if (config.interiorCeramic) {
    subtotal += CARE.ceramic.addons.interiorCeramic;
    breakdown.push(`Interior Ceramic: $${CARE.ceramic.addons.interiorCeramic.toFixed(2)}`);
  }

  return { subtotal, breakdown, requiresManualReview: false, reviewReasons: [] };
}

export function calculateGraphene(length: number, config: GrapheneConfig): PricingResult {
  const breakdown: string[] = [];
  let subtotal = 0;

  const basePrice = length * CARE.graphene.baseRatePerFoot;
  breakdown.push(`Graphene Coating: ${length}ft × $${CARE.graphene.baseRatePerFoot}/ft = $${basePrice.toFixed(2)}`);
  subtotal = basePrice;

  if (config.secondLayer) {
    const secondLayerCost = length * CARE.graphene.perFootAddons.secondLayer;
    subtotal += secondLayerCost;
    breakdown.push(`Second Layer: ${length}ft × $${CARE.graphene.perFootAddons.secondLayer}/ft = $${secondLayerCost.toFixed(2)}`);
  }

  if (config.teakGraphene) {
    subtotal += CARE.graphene.addons.teakGraphene;
    breakdown.push(`Teak Graphene: $${CARE.graphene.addons.teakGraphene.toFixed(2)}`);
  }

  return { subtotal, breakdown, requiresManualReview: false, reviewReasons: [] };
}

export function calculateWetSanding(length: number, config: WetSandingConfig): PricingResult {
  const breakdown: string[] = [];
  let subtotal = 0;

  const basePrice = length * CARE.wetSanding.baseRatePerFoot;
  breakdown.push(`Wet Sanding & Paint/Gelcoat Correction: ${length}ft × $${CARE.wetSanding.baseRatePerFoot}/ft = $${basePrice.toFixed(2)}`);
  subtotal = basePrice;

  if (config.deepScratchRepair) {
    subtotal += CARE.wetSanding.addons.deepScratchRepair;
    breakdown.push(`Deep Scratch Repair: $${CARE.wetSanding.addons.deepScratchRepair.toFixed(2)}`);
  }

  if (config.spotWetSanding > 0) {
    const sandingCost = config.spotWetSanding * CARE.wetSanding.spotWetSandingPerArea;
    subtotal += sandingCost;
    breakdown.push(`Spot Wet Sanding (${config.spotWetSanding} areas): $${sandingCost.toFixed(2)}`);
  }

  return { subtotal, breakdown, requiresManualReview: false, reviewReasons: [] };
}

export function calculateBottomPainting(length: number, config: BottomPaintingConfig): PricingResult {
  const breakdown: string[] = [];
  const reviewReasons: string[] = [];
  let subtotal = 0;

  const basePrice = length * CARE.bottomPainting.baseRatePerFoot;
  breakdown.push(`Bottom Painting: ${length}ft × $${CARE.bottomPainting.baseRatePerFoot}/ft = $${basePrice.toFixed(2)}`);
  subtotal = basePrice;

  if (config.secondCoat) {
    const secondCoatCost = length * CARE.bottomPainting.perFootAddons.secondCoat;
    subtotal += secondCoatCost;
    breakdown.push(`2nd Coat: ${length}ft × $${CARE.bottomPainting.perFootAddons.secondCoat}/ft = $${secondCoatCost.toFixed(2)}`);
  }

  if (config.oldPaintRemoval) {
    const removalCost = length * CARE.bottomPainting.perFootAddons.oldPaintRemoval;
    subtotal += removalCost;
    breakdown.push(`Old Paint Removal: ${length}ft × $${CARE.bottomPainting.perFootAddons.oldPaintRemoval}/ft = $${removalCost.toFixed(2)}`);
  }

  if (config.heavyGrowthRemoval) {
    subtotal += CARE.bottomPainting.addons.heavyGrowthRemoval;
    breakdown.push(`Heavy Growth Removal: $${CARE.bottomPainting.addons.heavyGrowthRemoval.toFixed(2)}`);
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

  const rates = CARE.vinyl.ratesPerFoot;

  const basePrice = length * rates[config.service];
  const serviceName =
    config.service === "both" ? "Removal + Install" : config.service === "removal" ? "Removal Only" : "Install Only";

  breakdown.push(`Vinyl ${serviceName}: ${length}ft × $${rates[config.service]}/ft = $${basePrice.toFixed(2)}`);
  subtotal = basePrice;

  if (config.customDesign) {
    subtotal += CARE.vinyl.addons.customDesign;
    breakdown.push(`Custom Design: $${CARE.vinyl.addons.customDesign.toFixed(2)}`);
  }

  return { subtotal, breakdown, requiresManualReview: false, reviewReasons: [] };
}

export function calculateWeeklyMaintenance(length: number): PricingResult {
  const subtotal = length * CARE.weeklyMaintenance.ratePerFoot;
  return {
    subtotal,
    breakdown: [
      `Weekly Service: ${length}ft × $${CARE.weeklyMaintenance.ratePerFoot}/ft = $${subtotal.toFixed(2)}`,
      "Includes: pressure wash, wipe down, chrome polish, and window cleaning.",
    ],
    requiresManualReview: false,
    reviewReasons: [],
  };
}

export function calculateBiweeklyMaintenance(length: number): PricingResult {
  const subtotal = length * CARE.biweeklyMaintenance.ratePerFoot;
  return {
    subtotal,
    breakdown: [
      `Bi-Weekly Service: ${length}ft × $${CARE.biweeklyMaintenance.ratePerFoot}/ft = $${subtotal.toFixed(2)}`,
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
