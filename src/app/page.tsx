import { Hero } from "@/components/site/hero";
import { InternalLinkGrid } from "@/components/site/internal-link-grid";
import { SectionCard } from "@/components/site/section-card";
import { StatStrip } from "@/components/site/stat-strip";
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

      <InternalLinkGrid
        title="Before and after worthy services"
        items={services.map((service) => ({
          href: `/services/${service.slug}`,
          title: service.name,
          description: service.shortDescription,
        }))}
      />

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
