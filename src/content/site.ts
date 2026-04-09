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
  email: "info@a1marinecare.ca",
  phone: "+1-705-555-0123",
  addressLocality: "Midland",
  addressRegion: "ON",
  postalCode: "L4R 0A1",
  addressCountry: "CA",
};

export const services: Service[] = [
  {
    slug: "boat-detailing",
    name: "Boat Detailing",
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
    slug: "wash-and-wax",
    name: "Wash and Wax",
    shortDescription: "Scheduled wash and wax maintenance for peak season presentation.",
    longDescription:
      "Scheduled maintenance package for routine washdowns, salt and grime removal, and premium wax application for ongoing shine between full details.",
    basePriceFrom: 219,
    duration: "2-4 hours",
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

export function getServiceBySlug(slug: string) {
  return serviceMap.get(slug);
}

export function getLocationBySlug(slug: string) {
  return locationMap.get(slug);
}
