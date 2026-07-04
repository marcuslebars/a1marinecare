// Single dispatcher shared by the fixture generator and the golden test, so the
// two can never diverge in how a case maps to a pricing computation.

import {
  calculateGelcoat,
  calculateExterior,
  calculateInterior,
  calculateCeramic,
  calculateGraphene,
  calculateWetSanding,
  calculateBottomPainting,
  calculateVinyl,
  calculateWeeklyMaintenance,
  calculateBiweeklyMaintenance,
  calculateTotal,
  type PricingResult,
} from "@/lib/quote-pricing";
import type { GoldenCase } from "./matrix";

export interface SerializedResult {
  subtotal: number;
  breakdown: string[];
  requiresManualReview: boolean;
  reviewReasons: string[];
}

export function computeCase(c: GoldenCase): PricingResult {
  switch (c.service) {
    case "gelcoat":
      return calculateGelcoat(c.length, c.config);
    case "exterior":
      return calculateExterior(c.length, c.config);
    case "interior":
      return calculateInterior(c.length, c.boatType, c.config);
    case "ceramic":
      return calculateCeramic(c.length, c.config);
    case "graphene":
      return calculateGraphene(c.length, c.config);
    case "wetSanding":
      return calculateWetSanding(c.length, c.config);
    case "bottomPainting":
      return calculateBottomPainting(c.length, c.config);
    case "vinyl":
      return calculateVinyl(c.length, c.config);
    case "weekly":
      return calculateWeeklyMaintenance(c.length);
    case "biweekly":
      return calculateBiweeklyMaintenance(c.length);
    case "total":
      return calculateTotal(c.length, c.boatType, c.services);
  }
}

export function serializeResult(r: PricingResult): SerializedResult {
  return {
    subtotal: r.subtotal,
    breakdown: r.breakdown,
    requiresManualReview: r.requiresManualReview,
    reviewReasons: r.reviewReasons,
  };
}

/** Integer cents — the "to the cent" comparison bar from the brief. */
export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}
