import { Hero } from "@/components/site/hero";
import { InternalLinkGrid } from "@/components/site/internal-link-grid";
import { SectionCard } from "@/components/site/section-card";
import { StatStrip } from "@/components/site/stat-strip";
import Image from "next/image";
import { locations, services } from "@/content/site";

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

      <section className="section-space pt-0">
        <div className="page-shell">
          <div className="mb-6 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Before and After Results</p>
              <h2 className="mt-2 text-2xl font-semibold md:text-3xl">Real finishes. Real vessel transformations.</h2>
            </div>
            <p className="max-w-xl text-sm text-muted-foreground">From faded gelcoat to a deep reflective finish, every detail is performed dockside with premium marine-safe products.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              "/images/before-after/results-candidate-1.jpg",
              "/images/before-after/results-candidate-2.png",
              "/images/before-after/results-candidate-3.jpg",
              "/images/before-after/results-candidate-4.jpg",
            ].map((src, index) => (
              <div key={src} className="surface-panel relative aspect-[16/10] overflow-hidden">
                <Image
                  src={src}
                  alt={`A1 Marine Care results gallery image ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-transparent" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <InternalLinkGrid
        title="Before and after worthy services"
        items={services.map((service) => {
          const serviceImageMap: Record<string, string> = {
            "boat-detailing": "/images/services/exterior-detailing.jpg",
            "gelcoat-restoration": "/images/services/gelcoat-restoration.jpg",
            "ceramic-coating": "/images/services/ceramic-coating.jpg",
            "interior-detailing": "/images/services/interior-detailing.jpg",
            "wash-and-wax": "/images/services/wash-and-wax.jpg",
          };

          return {
            href: `/services/${service.slug}`,
            title: service.name,
            description: service.shortDescription,
            imageSrc: serviceImageMap[service.slug],
          };
        })}
      />

      <section className="section-space pt-0">
        <div className="page-shell grid gap-4 md:grid-cols-2">
          <div className="surface-panel relative aspect-[16/10] overflow-hidden">
            <Image src="/images/marinas/marina-1.jpg" alt="Marina service environment in Georgian Bay" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
            <div className="absolute bottom-0 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">Trusted Environments</p>
              <p className="mt-2 text-xl font-semibold text-white">Proudly Serving Georgian Bay, Muskoka, and Lake Simcoe</p>
            </div>
          </div>
          <div className="surface-panel relative aspect-[16/10] overflow-hidden">
            <Image src="/images/marinas/marina-2.jpg" alt="Premium marina and vessel care setting" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
            <div className="absolute bottom-0 p-6">
              <p className="text-sm text-cyan-100/90">Detailed dockside service for private slips, marinas, and seasonal waterfront properties.</p>
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
