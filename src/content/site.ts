export type Service = {
  slug: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  basePriceFrom: number;
  duration: string;
};

export type Location = {
  slug: string;
  name: string;
  region: string;
  shortDescription: string;
};

export const company = {
  name: "A1 Marine Care",
  legalName: "A1 Marine Care Inc.",
  url: "https://www.a1marinecare.ca",
  email: "contact@a1marinecare.ca",
  phone: "705-996-1010",
  addressLocality: "Midland",
  addressRegion: "ON",
  postalCode: "L4R 0A1",
  addressCountry: "CA",
};

export const services: Service[] = [
  {
    // Mobile shrink wrap — the seasonal (fall) offer that replaced A1 Marine
    // Storage. Its page is /shrink-wrapping (NOT /services/shrink-wrapping,
    // which 301s there — see next.config.mjs); pricing is in
    // @/lib/shrink-wrap-pricing until the engine gains the service.
    slug: "shrink-wrapping",
    name: "Shrink Wrapping",
    shortDescription: "Mobile boat shrink wrapping at your driveway, dock, or marina — we come to you.",
    longDescription:
      "Commercial-grade vented shrink wrap installed tight over a built-up support frame, at your driveway, dock, or marina slip. Optional engine winterization in the same visit so your boat is fully put to bed for a Georgian Bay winter without ever leaving your property.",
    basePriceFrom: 400,
    duration: "2-4 hours",
  },
  {
    slug: "boat-detailing",
    name: "Exterior Detailing",
    shortDescription: "Full exterior detailing that restores showroom gloss on premium vessels.",
    longDescription:
      "A complete top-to-bottom detailing package focused on oxidation removal, stain treatment, and finish restoration for fiberglass and painted marine surfaces.",
    basePriceFrom: 349,
    duration: "4-8 hours",
  },
  {
    slug: "gelcoat-restoration",
    name: "Gelcoat Restoration",
    shortDescription: "Multi-stage cut and polish for heavily weathered gelcoat.",
    longDescription:
      "Multi-stage correction service designed to revive aged gelcoat, remove heavy oxidation, and recover clarity before long-term protection is applied.",
    basePriceFrom: 499,
    duration: "6-10 hours",
  },
  {
    slug: "ceramic-coating",
    name: "Ceramic Coating",
    shortDescription: "Marine ceramic protection for deep gloss and easier upkeep.",
    longDescription:
      "Marine-grade ceramic coating that improves gloss, reduces wash effort, and provides season-long UV and environmental protection.",
    basePriceFrom: 799,
    duration: "1-2 days",
  },
  {
    slug: "interior-detailing",
    name: "Interior Detailing",
    shortDescription: "Cabin, helm, vinyl, and upholstery correction for a clean luxury interior.",
    longDescription:
      "Interior reset service including vinyl treatment, carpet extraction, compartment wipe-down, and mold-prone area targeting for cleaner storage.",
    basePriceFrom: 279,
    duration: "3-6 hours",
  },
  {
    slug: "graphene-coating",
    name: "Graphene Nano Coating",
    shortDescription: "Next-generation graphene matrix coating for superior durability and hydrophobic properties.",
    longDescription:
      "Advanced graphene-based ceramic coating offering extended durability, enhanced UV resistance, and superior water-beading compared to standard ceramic options.",
    basePriceFrom: 1299,
    duration: "1-2 days",
  },
  {
    slug: "wet-sanding",
    name: "Wet Sanding / Paint Correction",
    shortDescription: "Precision wet sanding and multi-stage paint correction for show-car results.",
    longDescription:
      "Specialized correction service using progressive wet sanding techniques combined with machine polishing to remove deep oxidation, scratches, and swirl marks.",
    basePriceFrom: 699,
    duration: "1-2 days",
  },
  {
    slug: "bottom-painting",
    name: "Bottom Painting",
    shortDescription: "Anti-fouling bottom coating application for seasonal protection.",
    longDescription:
      "Professional bottom paint application using premium anti-fouling coatings to protect hull from marine growth, algae, and zebra mussels during the season.",
    basePriceFrom: 899,
    duration: "1 day",
  },
  {
    slug: "vinyl-removal",
    name: "Vinyl Removal / Installation",
    shortDescription: "Custom vinyl graphics, striping, and name lettering installation.",
    longDescription:
      "Complete vinyl services including removal of old graphics, surface preparation, and professional installation of new vinyl striping, names, and decorative elements.",
    basePriceFrom: 399,
    duration: "4-8 hours",
  },
  {
    slug: "weekly-maintenance-plan",
    name: "Weekly Service",
    shortDescription: "Premium recurring wash-and-wipe maintenance for owners who want their boat ready every week.",
    longDescription:
      "A recurring weekly maintenance plan that keeps your boat presentation-ready with a pressure wash, wipe down, chrome polish, and window cleaning on a fixed weekly cadence.",
    basePriceFrom: 120,
    duration: "2-4 hours per visit",
  },
  {
    slug: "bi-weekly-maintenance-plan",
    name: "Bi-Weekly Service",
    shortDescription: "Premium recurring maintenance visits on an every-other-week cadence.",
    longDescription:
      "A recurring bi-weekly maintenance plan for owners who want consistent upkeep with pressure washing, wipe down service, chrome polish, and window cleaning every other week.",
    basePriceFrom: 140,
    duration: "2-4 hours per visit",
  },
];

export const locations: Location[] = [
  {
    slug: "georgian-bay",
    name: "Georgian Bay",
    region: "Ontario",
    shortDescription: "High-end dockside detailing for marinas and private slips across Georgian Bay.",
  },
  {
    slug: "midland",
    name: "Midland",
    region: "Ontario",
    shortDescription: "Fast-response marine care services in Midland marinas.",
  },
  {
    slug: "penetanguishene",
    name: "Penetanguishene",
    region: "Ontario",
    shortDescription: "Dockside boat care services in Penetanguishene harbour.",
  },
  {
    slug: "parry-sound",
    name: "Parry Sound",
    region: "Ontario",
    shortDescription: "Premium marine detailing services throughout Parry Sound.",
  },
  {
    slug: "honey-harbour",
    name: "Honey Harbour",
    region: "Ontario",
    shortDescription: "Mobile boat detailing for Honey Harbour and surrounding waterways.",
  },
  {
    slug: "port-severn",
    name: "Port Severn",
    region: "Ontario",
    shortDescription: "Boat care services for Port Severn and the Trent-Severn Waterway.",
  },
  {
    slug: "muskoka",
    name: "Muskoka",
    region: "Ontario",
    shortDescription: "Premium mobile detailing for Muskoka boat owners and seasonal estates.",
  },
  {
    slug: "bracebridge",
    name: "Bracebridge",
    region: "Ontario",
    shortDescription: "Boat detailing and protection services in Bracebridge.",
  },
  {
    slug: "gravenhurst",
    name: "Gravenhurst",
    region: "Ontario",
    shortDescription: "Mobile marine care services for Gravenhurst and Muskoka Lakes.",
  },
  {
    slug: "port-carling",
    name: "Port Carling",
    region: "Ontario",
    shortDescription: "Dockside boat services for the Port Carling area and locks.",
  },
  {
    slug: "lake-simcoe",
    name: "Lake Simcoe",
    region: "Ontario",
    shortDescription: "Seasonal detailing and ceramic protection throughout Lake Simcoe.",
  },
  {
    slug: "barrie",
    name: "Barrie",
    region: "Ontario",
    shortDescription: "Boat detailing and coating services in Barrie.",
  },
  {
    slug: "orillia",
    name: "Orillia",
    region: "Ontario",
    shortDescription: "Marine care services for Orillia and Lake Couchiching.",
  },
  {
    slug: "innisfil",
    name: "Innisfil",
    region: "Ontario",
    shortDescription: "Boat detailing services for Innisfil and the southern Lake Simcoe region.",
  },
];

export const serviceMap = new Map(services.map((service) => [service.slug, service]));
export const locationMap = new Map(locations.map((location) => [location.slug, location]));

export const serviceNameToSlug: Record<string, string> = {
  "Shrink Wrapping": "shrink-wrapping",
  "Exterior Detailing": "boat-detailing",
  "Gelcoat Restoration": "gelcoat-restoration",
  "Ceramic Coating": "ceramic-coating",
  "Interior Detailing": "interior-detailing",
  "Graphene Nano Coating": "graphene-coating",
  "Wet Sanding / Paint Correction": "wet-sanding",
  "Bottom Painting": "bottom-painting",
  "Vinyl Removal / Installation": "vinyl-removal",
  "Weekly Service": "weekly-maintenance-plan",
  "Bi-Weekly Service": "bi-weekly-maintenance-plan",
};

export const slugToServiceName: Record<string, string> = {
  "shrink-wrapping": "Shrink Wrapping",
  "boat-detailing": "Exterior Detailing",
  "gelcoat-restoration": "Gelcoat Restoration",
  "ceramic-coating": "Ceramic Coating",
  "interior-detailing": "Interior Detailing",
  "graphene-coating": "Graphene Nano Coating",
  "wet-sanding": "Wet Sanding / Paint Correction",
  "bottom-painting": "Bottom Painting",
  "vinyl-removal": "Vinyl Removal / Installation",
  "weekly-maintenance-plan": "Weekly Service",
  "bi-weekly-maintenance-plan": "Bi-Weekly Service",
};

export type RecurrenceType = "weekly" | "biweekly";

export const recurringServiceSlugs = ["weekly-maintenance-plan", "bi-weekly-maintenance-plan"] as const;
const recurringServiceSlugSet = new Set<string>(recurringServiceSlugs);

export function isRecurringServiceSlug(slug: string) {
  return recurringServiceSlugSet.has(slug);
}

export function getRecurringServiceTypeBySlug(slug: string): RecurrenceType | null {
  if (slug === "weekly-maintenance-plan") return "weekly";
  if (slug === "bi-weekly-maintenance-plan") return "biweekly";
  return null;
}

export function getRecurringServiceRate(slug: string): number | null {
  if (slug === "weekly-maintenance-plan") return 6;
  if (slug === "bi-weekly-maintenance-plan") return 7;
  return null;
}

/** Services whose page is a dedicated route rather than /services/[slug]. */
export const SERVICE_PAGE_HREF: Record<string, string> = {
  "shrink-wrapping": "/shrink-wrapping",
};

export function getServiceHref(slug: string) {
  return SERVICE_PAGE_HREF[slug] ?? `/services/${slug}`;
}

export function getServiceBySlug(slug: string) {
  return serviceMap.get(slug);
}

export function getLocationBySlug(slug: string) {
  return locationMap.get(slug);
}

export function getServiceSlugByName(name: string): string | null {
  return serviceNameToSlug[name] ?? null;
}

export function getServiceNamesFromSlugs(slugs: string[]): string[] {
  return slugs.map((slug) => slugToServiceName[slug] ?? slug).filter(Boolean);
}
