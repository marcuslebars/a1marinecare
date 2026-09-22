// Mobile shrink wrap pricing — A1 Marine Care.
//
// TEMPORARY HOME. This is the pricing for the private (mobile) shrink-wrap
// offer that replaced A1 Marine Storage. It belongs in @a1/pricing-engine as a
// `mobile_shrink_wrap` service; it lives here for now because this site pins
// the engine at #v1.0.1 and bumping that pin is a separate change. When the
// engine gains the service, delete this file and re-export from the engine —
// the calculator's output shape is deliberately engine-like so that swap is
// mechanical. The test in shrink-wrap-pricing.test.ts pins the numbers.
//
// Every value is in CENTS. Hull surcharges and winterization rates mirror the
// engine's storage config exactly (pricing.config.json → storage.hullSurcharges
// / winterization_*), so a customer gets the same winterization price here as
// they did on the old storage site.

export const SHRINK_WRAP = {
  currency: "CAD",
  /** $28/ft — the private/mobile rate (yard rate was $25/ft). */
  rateCents: 2800,
  /** $400 minimum. */
  minimumCents: 40000,
  /** Per-foot hull surcharge, applied on top of the per-foot charge. */
  hullSurchargePerFootCents: {
    pontoon: 1600,
    tritoon: 2000,
  } as Record<string, number>,
  /** Flat, per engine. Additional engines at ×0.75 (matches the engine config). */
  winterization: {
    outboard: { rateCents: 27500, label: "Winterization — outboard" },
    sterndrive: { rateCents: 40000, label: "Winterization — sterndrive (I/O)" },
    inboard: { rateCents: 44500, label: "Winterization — inboard" },
  } as Record<string, { rateCents: number; label: string }>,
  additionalEngineMultiplier: 0.75,
  /** Boats longer than this are quoted by hand. */
  maxLengthFt: 40,
  minLengthFt: 8,
} as const;

export type HullType = "bowrider" | "cuddy" | "cruiser" | "pontoon" | "tritoon" | "sailboat" | "pwc" | "other";
export type EngineType = "outboard" | "sterndrive" | "inboard";

export const HULL_TYPES: Array<{ value: HullType; label: string }> = [
  { value: "bowrider", label: "Bowrider / runabout" },
  { value: "cuddy", label: "Cuddy cabin" },
  { value: "cruiser", label: "Cruiser" },
  { value: "pontoon", label: "Pontoon" },
  { value: "tritoon", label: "Tritoon" },
  { value: "sailboat", label: "Sailboat" },
  { value: "pwc", label: "PWC / Sea-Doo" },
  { value: "other", label: "Other" },
];

export const ENGINE_TYPES: Array<{ value: EngineType; label: string }> = [
  { value: "outboard", label: "Outboard" },
  { value: "sterndrive", label: "Sterndrive (I/O)" },
  { value: "inboard", label: "Inboard" },
];

export interface ShrinkWrapSelection {
  lengthFt: number;
  hullType: HullType;
  winterization?: { engineType: EngineType; engineCount: number } | null;
}

export interface ShrinkWrapLineItem {
  key: "shrink_wrap" | "hull_surcharge" | "winterization";
  label: string;
  description: string;
  amountCents: number;
}

export interface ShrinkWrapQuote {
  lineItems: ShrinkWrapLineItem[];
  subtotalCents: number;
  /** True when the boat is outside the auto-quote range and needs a call. */
  requiresManualReview: boolean;
  reviewReasons: string[];
}

export function formatCents(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars)
    ? `$${dollars.toLocaleString("en-CA")}`
    : `$${dollars.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function hullSurchargePerFootCents(hullType: string): number {
  return SHRINK_WRAP.hullSurchargePerFootCents[hullType] ?? 0;
}

export function winterizationCents(engineType: EngineType, engineCount: number): number {
  const svc = SHRINK_WRAP.winterization[engineType];
  if (!svc) return 0;
  const count = Math.max(1, Math.floor(engineCount || 1));
  const additional = Math.round(svc.rateCents * SHRINK_WRAP.additionalEngineMultiplier) * (count - 1);
  return svc.rateCents + additional;
}

export function calculateShrinkWrapQuote(selection: ShrinkWrapSelection): ShrinkWrapQuote {
  const lengthFt = Number.isFinite(selection.lengthFt) ? Math.round(selection.lengthFt) : 0;
  const reviewReasons: string[] = [];
  const lineItems: ShrinkWrapLineItem[] = [];

  if (lengthFt < SHRINK_WRAP.minLengthFt) {
    reviewReasons.push(`Boat length under ${SHRINK_WRAP.minLengthFt} ft`);
  }
  if (lengthFt > SHRINK_WRAP.maxLengthFt) {
    reviewReasons.push(`Boats over ${SHRINK_WRAP.maxLengthFt} ft are quoted individually`);
  }

  const perFoot = SHRINK_WRAP.rateCents * Math.max(lengthFt, 0);
  const wrapCents = Math.max(perFoot, SHRINK_WRAP.minimumCents);
  lineItems.push({
    key: "shrink_wrap",
    label: "Mobile shrink wrap",
    description:
      perFoot < SHRINK_WRAP.minimumCents
        ? `${lengthFt} ft × ${formatCents(SHRINK_WRAP.rateCents)}/ft — ${formatCents(SHRINK_WRAP.minimumCents)} minimum applies`
        : `${lengthFt} ft × ${formatCents(SHRINK_WRAP.rateCents)}/ft`,
    amountCents: wrapCents,
  });

  const surchargePerFoot = hullSurchargePerFootCents(selection.hullType);
  if (surchargePerFoot > 0 && lengthFt > 0) {
    lineItems.push({
      key: "hull_surcharge",
      label: `${selection.hullType === "tritoon" ? "Tritoon" : "Pontoon"} surcharge`,
      description: `${lengthFt} ft × ${formatCents(surchargePerFoot)}/ft — extra film and framing for a wide deck`,
      amountCents: surchargePerFoot * lengthFt,
    });
  }

  if (selection.winterization) {
    const { engineType, engineCount } = selection.winterization;
    const svc = SHRINK_WRAP.winterization[engineType];
    if (svc) {
      const count = Math.max(1, Math.floor(engineCount || 1));
      lineItems.push({
        key: "winterization",
        label: svc.label,
        description:
          count > 1
            ? `${count} engines — additional engines at ${Math.round(SHRINK_WRAP.additionalEngineMultiplier * 100)}%`
            : "Fuel stabilizer, antifreeze through the cooling system, fogging, and drive/lower-unit service",
        amountCents: winterizationCents(engineType, count),
      });
    }
  }

  return {
    lineItems,
    subtotalCents: lineItems.reduce((sum, item) => sum + item.amountCents, 0),
    requiresManualReview: reviewReasons.length > 0,
    reviewReasons,
  };
}

/** "$28/ft · $400 minimum" — for badges and cards. */
export const SHRINK_WRAP_PRICE_LABEL = `${formatCents(SHRINK_WRAP.rateCents)}/ft · ${formatCents(SHRINK_WRAP.minimumCents)} minimum`;

/** "From $400" — for the schema.org offer and short badges. */
export const SHRINK_WRAP_FROM_LABEL = `From ${formatCents(SHRINK_WRAP.minimumCents)}`;
