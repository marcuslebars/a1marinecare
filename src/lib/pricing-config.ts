// The CARE config view (marine_care + coatings, in CAD dollars) now lives in
// @a1/pricing-engine — the single source of truth. Thin re-export so existing
// `@/lib/pricing-config` import sites keep working unchanged.
export { CARE } from "@a1/pricing-engine";
export type {
  GelcoatBand,
  CareGelcoat,
  CareExterior,
  CareInterior,
  CareWetSanding,
  CareBottomPainting,
  CareVinyl,
  CareCeramic,
  CareGraphene,
  CareMaintenance,
} from "@a1/pricing-engine";
