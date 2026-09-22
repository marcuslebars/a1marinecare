import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getServiceHref, services } from "@/content/site";
import { SHRINK_WRAP_PRICE_LABEL } from "@/lib/shrink-wrap-pricing";
import { getServiceStartingPriceLabel as engineStartingPriceLabel } from "@/lib/quote-pricing";

const getServiceStartingPriceLabel = (slug: string) =>
  slug === "shrink-wrapping" ? SHRINK_WRAP_PRICE_LABEL : engineStartingPriceLabel(slug);
import { absoluteUrl, buildDescription, buildTitle } from "@/lib/seo";

export const metadata: Metadata = {
  title: buildTitle("Services"),
  description: buildDescription("Complete marine detailing and protection services including exterior detailing, gelcoat restoration, ceramic coating, interior detailing, and more."),
  alternates: {
    canonical: absoluteUrl("/services"),
  },
};

const SERVICE_IMAGES: Record<string, string> = {
  "shrink-wrapping": "/images/services/shrink-wrapping.jpg",
  "boat-detailing": "/images/services/exterior-detailing.jpg",
  "gelcoat-restoration": "/images/services/gelcoat-restoration.jpg",
  "ceramic-coating": "/images/services/ceramic-coating.jpg",
  "interior-detailing": "/images/services/interior-detailing.jpg",
  "graphene-coating": "/images/services/ceramic-coating.jpg",
  "wet-sanding": "/images/services/gelcoat-restoration.jpg",
  "bottom-painting": "/images/services/bottom-painting.jpg",
  "vinyl-removal": "/images/services/vinyl-removal.jpg",
};

export default function ServicesPage() {
  return (
    <>
      <section className="relative bg-surface-ocean py-20 md:py-28">
        <div className="page-shell text-center">
          <p className="text-sm font-medium uppercase tracking-[0.15em] text-primary">Our Services</p>
          <h1 className="mt-3 text-4xl font-bold md:text-6xl">Complete Marine Care</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">
            From routine maintenance to full restoration, we offer comprehensive detailing and protection services for premium vessels across Ontario.
          </p>
        </div>
      </section>

      <section className="section-space">
        <div className="page-shell">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Link
                key={service.slug}
                href={getServiceHref(service.slug)}
                className="group surface-panel relative overflow-hidden rounded-2xl border border-transparent bg-gradient-to-b from-card to-card/80 p-6 transition-all duration-500 hover:border-primary/30 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5"
              >
                {SERVICE_IMAGES[service.slug] && (
                  <div className="relative -mx-6 -mt-6 mb-6 aspect-[16/9] overflow-hidden">
                    <Image
                      src={SERVICE_IMAGES[service.slug]}
                      alt={service.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
                  </div>
                )}
                <h2 className="text-xl font-semibold text-foreground">{service.name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{service.shortDescription}</p>
                <div className="mt-4 flex items-center gap-2 text-sm font-medium text-primary">
                  <span>{getServiceStartingPriceLabel(service.slug)}</span>
                  <span className="text-muted-foreground/50">•</span>
                  <span>{service.duration}</span>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm font-medium text-primary">
                  Learn more <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section-space bg-gradient-to-b from-primary/5 to-primary/10">
        <div className="page-shell text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Ready to Get Started?</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Request a personalized quote or reserve your service date. We service Georgian Bay, Muskoka, and Lake Simcoe.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="gap-2">
              <Link href="/quote">
                Request Quote <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link href="/booking">
                Reserve Date <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
