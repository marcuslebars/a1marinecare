import Image from "next/image";
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

  const title = buildTitle(`Premium boat detailing in ${location.name}`);
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
      <section className="relative overflow-hidden bg-black">
        <Image
          src="/images/locations/clients-background.jpg"
          alt="Premium yachts docked at a marina along clear blue water"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/88 via-black/66 to-black/38" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/28 to-black/12" />

        <div className="page-shell relative z-10 py-24 md:py-32 lg:py-40">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">Service Region</p>
          <h1 className="mt-2 max-w-4xl text-4xl font-semibold text-white md:text-6xl">
            Premium boat detailing in {location.name}
          </h1>
          <p className="mt-4 max-w-3xl text-base text-white/80 md:text-lg">
            {location.shortDescription} We deliver high-end dockside detailing for owners who want stronger gloss, cleaner surfaces, and dependable seasonal protection.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <Link href="/quote" className="rounded-full bg-primary px-4 py-1 text-primary-foreground">
              Request premium quote
            </Link>
            <Link href="/booking" className="rounded-full border border-white/20 bg-white/10 px-4 py-1 text-white backdrop-blur-sm">
              Reserve service date
            </Link>
          </div>
        </div>
      </section>

      <InternalLinkGrid
        title={`Premium services in ${location.name}`}
        items={services.map((service) => ({
          href: `/${service.slug}/${location.slug}`,
          title: `${service.name} in ${location.name}`,
          description: `${service.shortDescription} in ${location.name}, ${location.region}.`,
        }))}
      />

      <InternalLinkGrid
        title="Nearby service regions"
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
