import { company, type Location, type Service } from "@/content/site";
import { absoluteUrl } from "@/lib/seo";

type WithContext<T> = T & { "@context": "https://schema.org" };

export type LocalBusinessSchema = WithContext<{
  "@type": "LocalBusiness";
  name: string;
  legalName: string;
  image: string;
  url: string;
  email: string;
  telephone: string;
  areaServed: string[];
  address: {
    "@type": "PostalAddress";
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
}>;

export type ServiceSchema = WithContext<{
  "@type": "Service";
  name: string;
  description: string;
  provider: {
    "@type": "LocalBusiness";
    name: string;
    url: string;
  };
  areaServed: string;
  offers: {
    "@type": "Offer";
    priceCurrency: "CAD";
    price: number;
    availability: "https://schema.org/InStock";
    url: string;
  };
}>;

export function localBusinessSchema(areas: string[]): LocalBusinessSchema {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: company.name,
    legalName: company.legalName,
    image: absoluteUrl("/placeholder.svg"),
    url: company.url,
    email: company.email,
    telephone: company.phone,
    areaServed: areas,
    address: {
      "@type": "PostalAddress",
      addressLocality: company.addressLocality,
      addressRegion: company.addressRegion,
      postalCode: company.postalCode,
      addressCountry: company.addressCountry,
    },
  };
}

export function serviceSchema(service: Service, location?: Location): ServiceSchema {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: location ? `${service.name} in ${location.name}` : service.name,
    description: service.longDescription,
    provider: {
      "@type": "LocalBusiness",
      name: company.name,
      url: company.url,
    },
    areaServed: location ? `${location.name}, ${location.region}` : "Ontario, Canada",
    offers: {
      "@type": "Offer",
      priceCurrency: "CAD",
      price: service.basePriceFrom,
      availability: "https://schema.org/InStock",
      url: location
        ? absoluteUrl(`/${service.slug}/${location.slug}`)
        : absoluteUrl(`/services/${service.slug}`),
    },
  };
}
