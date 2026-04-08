import { Hero } from "@/components/site/hero";
import { InternalLinkGrid } from "@/components/site/internal-link-grid";
import { SectionCard } from "@/components/site/section-card";
import { StatStrip } from "@/components/site/stat-strip";
import { locations, services } from "@/content/site";

export default function HomePage() {
  return (
    <>
      <Hero
        title="Production marine detailing platform for Ontario service areas"
        description="A1 Marine Care combines SEO landing pages, quote workflows, and online booking into one scalable Next.js platform built for multi-location growth."
        primaryHref="/quote"
        primaryLabel="Start Quote"
        secondaryHref="/booking"
        secondaryLabel="Book Service"
      />

      <StatStrip
        stats={[
          { label: "Active Service Lines", value: String(services.length) },
          { label: "Primary Locations", value: String(locations.length) },
          { label: "Quote Steps", value: "6" },
          { label: "Booking Steps", value: "4" },
        ]}
      />

      <section className="section-space">
        <div className="page-shell grid gap-4 md:grid-cols-3">
          <SectionCard
            title="SEO at scale"
            description="Dynamic service, location, and service-location pages with metadata and schema markup."
            points={[
              "Reusable route templates",
              "Server-rendered metadata",
              "Internal linking mesh",
            ]}
          />
          <SectionCard
            title="Quote application"
            description="Multi-step quote flow with modular components and state persistence across steps."
            points={[
              "Structured lead payload",
              "Validation and review step",
              "API endpoint integration",
            ]}
          />
          <SectionCard
            title="Booking system"
            description="Calendar and time slot booking with confirmation and backend submission hooks."
            points={[
              "Service and location aware",
              "Summary before confirmation",
              "Supabase-ready data layer",
            ]}
          />
        </div>
      </section>

      <InternalLinkGrid
        title="Explore services"
        items={services.map((service) => ({
          href: `/services/${service.slug}`,
          title: service.name,
          description: service.shortDescription,
        }))}
      />

      <InternalLinkGrid
        title="Explore service locations"
        items={locations.map((location) => ({
          href: `/locations/${location.slug}`,
          title: location.name,
          description: location.shortDescription,
        }))}
      />
    </>
  );
}
