import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { InternalLinkGrid } from "@/components/site/internal-link-grid";
import { getLocationBySlug, locations, services } from "@/content/site";
import { absoluteUrl, buildDescription, buildTitle } from "@/lib/seo";

type LocationPageParams = {
  params: Promise<{ location: string }>;
};

export async function generateStaticParams() {
  return locations.map((location) => ({ location: location.slug }));
}

export async function generateMetadata({ params }: LocationPageParams): Promise<Metadata> {
  const { location: locationSlug } = await params;
  const location = getLocationBySlug(locationSlug);

  if (!location) {
    return {};
  }

  const title = buildTitle(`Marine detailing in ${location.name}`);
  const description = buildDescription(location.shortDescription);

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/locations/${location.slug}`),
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/locations/${location.slug}`),
      type: "article",
    },
  };
}

export default async function LocationPage({ params }: LocationPageParams) {
  const { location: locationSlug } = await params;
  const location = getLocationBySlug(locationSlug);

  if (!location) {
    notFound();
  }

  return (
    <>
      <section className="section-space bg-surface-ocean">
        <div className="page-shell">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">Location</p>
          <h1 className="mt-2 text-4xl font-semibold">Boat detailing in {location.name}</h1>
          <p className="mt-4 max-w-3xl text-base text-muted-foreground">
            {location.shortDescription} We provide dockside and marina-ready detailing programs for seasonal and year-round vessel care.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <Link href="/quote" className="rounded-full bg-primary px-4 py-1 text-primary-foreground">
              Request quote
            </Link>
            <Link href="/booking" className="rounded-full border border-border bg-card px-4 py-1">
              Book appointment
            </Link>
          </div>
        </div>
      </section>

      <InternalLinkGrid
        title={`Services available in ${location.name}`}
        items={services.map((service) => ({
          href: `/${service.slug}/${location.slug}`,
          title: `${service.name} in ${location.name}`,
          description: `${service.shortDescription} in ${location.name}, ${location.region}.`,
        }))}
      />

      <InternalLinkGrid
        title="Nearby coverage pages"
        items={locations
          .filter((item) => item.slug !== location.slug)
          .map((item) => ({
            href: `/locations/${item.slug}`,
            title: item.name,
            description: item.shortDescription,
          }))}
      />
    </>
  );
}
