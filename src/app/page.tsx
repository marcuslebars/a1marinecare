import { Hero } from "@/components/site/hero";
import { InternalLinkGrid } from "@/components/site/internal-link-grid";
import { SectionCard } from "@/components/site/section-card";
import { StatStrip } from "@/components/site/stat-strip";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { locations, services } from "@/content/site";

const CORE_SERVICES = ["boat-detailing", "gelcoat-restoration", "ceramic-coating", "interior-detailing"];

const SERVICE_IMAGES: Record<string, string> = {
  "boat-detailing": "/images/services/exterior-detailing.jpg",
  "gelcoat-restoration": "/images/services/gelcoat-restoration.jpg",
  "ceramic-coating": "/images/services/ceramic-coating.jpg",
  "interior-detailing": "/images/services/interior-detailing.jpg",
};

export default function HomePage() {
  return (
    <>
      <Hero
        title="Premium Boat Detailing in Georgian Bay"
        description="Trusted by owners of high-value vessels across Georgian Bay, Muskoka, and Lake Simcoe for deep gloss restoration, ceramic protection, and meticulous dockside care."
        primaryHref="/quote"
        primaryLabel="Request Premium Quote"
        secondaryHref="/booking"
        secondaryLabel="Reserve Your Date"
      />

      <StatStrip
        stats={[
          { label: "Boats Detailed", value: "500+" },
          { label: "Years On Water", value: "15+" },
          { label: "Core Service Regions", value: "3" },
          { label: "Average Rating", value: "5.0" },
        ]}
      />

      <section className="section-space">
        <div className="page-shell grid gap-4 md:grid-cols-3">
          <SectionCard
            title="Before and After Results"
            description="We correct oxidation, waterline staining, and dull gelcoat to restore a rich, reflective finish."
            points={[
              "Heavy oxidation removal",
              "Multi-stage machine polishing",
              "Mirror-depth final gloss",
            ]}
          />
          <SectionCard
            title="Trusted by Boat Owners"
            description="Owners choose us when they want reliable communication, careful handling, and consistent premium outcomes."
            points={[
              "5-star local reviews",
              "Transparent estimates",
              "Fully mobile dockside service",
            ]}
          />
          <SectionCard
            title="Built for High-Value Vessels"
            description="From day boats to luxury cruisers, we tailor service plans for finish type, usage, and marina conditions."
            points={[
              "Marine-safe premium products",
              "Ceramic and seasonal protection",
              "Meticulous interior and exterior care",
            ]}
          />
        </div>
      </section>

      <section className="section-space border-y border-border/70 bg-black py-10 md:py-14">
        <div className="page-shell">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Before and After Results</p>
              <h2 className="mt-2 text-4xl font-black leading-tight md:text-6xl">See the Difference</h2>
            </div>
            <p className="max-w-xl text-sm text-muted-foreground md:text-base">From faded gelcoat to mirror-like depth, every pass is built to transform the finish in real marina conditions.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {[
              { src: "/images/before-after/results-candidate-1.jpg", tag: "Before" },
              { src: "/images/before-after/results-candidate-2.png", tag: "After" },
              { src: "/images/before-after/results-candidate-3.jpg", tag: "Before" },
              { src: "/images/before-after/results-candidate-4.jpg", tag: "After" },
            ].map((item, index) => (
              <div key={item.src} className={`surface-panel relative overflow-hidden ${index < 2 ? "aspect-[16/10]" : "aspect-[16/9]"}`}>
                <Image
                  src={item.src}
                  alt={`A1 Marine Care results gallery image ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute left-3 top-3 rounded-sm border border-white/40 bg-black/60 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white">
                  {item.tag}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-space">
        <div className="page-shell">
          <div className="mb-10 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.15em] text-primary">What We Offer</p>
            <h2 className="mt-2 text-4xl font-bold md:text-5xl">Premium Marine Services</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              From oxidation removal to ceramic protection, we deliver the finish your vessel deserves.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {services
              .filter((s) => CORE_SERVICES.includes(s.slug))
              .map((service) => (
                <Link
                  key={service.slug}
                  href={`/services/${service.slug}`}
                  className="group relative aspect-[16/10] overflow-hidden rounded-2xl"
                >
                  <Image
                    src={SERVICE_IMAGES[service.slug]}
                    alt={service.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                    <h3 className="text-xl font-bold text-white md:text-2xl">{service.name}</h3>
                    <p className="mt-2 text-sm text-white/70">{service.shortDescription}</p>
                    <div className="mt-4 flex items-center gap-2 text-sm font-medium text-primary">
                      From ${service.basePriceFrom} CAD <span className="text-white/40">•</span> {service.duration}
                    </div>
                  </div>
                </Link>
              ))}
          </div>
          <div className="mt-10 text-center">
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link href="/services">
                View All Services <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="section-space py-10 md:py-14">
        <div className="page-shell grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
          <div className="surface-panel relative aspect-[16/10] overflow-hidden">
            <Image src="/images/marinas/marina-1.jpg" alt="Marina service environment in Georgian Bay" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
            <div className="absolute bottom-0 p-5 md:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">Trusted Environments</p>
              <p className="mt-2 text-2xl font-black text-white md:text-3xl">Proudly Serving Georgian Bay, Muskoka, and Lake Simcoe</p>
            </div>
          </div>
          <div className="surface-panel relative aspect-[16/10] overflow-hidden">
            <Image src="/images/marinas/marina-2.jpg" alt="Premium marina and vessel care setting" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
            <div className="absolute bottom-0 p-5 md:p-7">
              <p className="text-sm text-cyan-100/90 md:text-base">Detailed dockside service for private slips, marinas, and seasonal waterfront properties.</p>
            </div>
          </div>
        </div>
      </section>

      <InternalLinkGrid
        title="Proudly serving local marinas"
        items={locations.map((location) => ({
          href: `/locations/${location.slug}`,
          title: location.name,
          description: location.shortDescription,
        }))}
      />
    </>
  );
}
