import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { InternalLinkGrid } from "@/components/site/internal-link-grid";
import { SchemaScript } from "@/components/site/schema-script";
import {
  getLocationBySlug,
  getServiceBySlug,
  locations,
  services,
} from "@/content/site";
import { absoluteUrl, buildTitle } from "@/lib/seo";
import { serviceSchema } from "@/lib/schema";

type CombinedPageParams = {
  params: Promise<{ service: string; location: string }>;
};

export async function generateStaticParams() {
  return services.flatMap((service) => locations.map((location) => ({ service: service.slug, location: location.slug })));
}

export async function generateMetadata({ params }: CombinedPageParams): Promise<Metadata> {
  const { service: serviceSlug, location: locationSlug } = await params;
  const service = getServiceBySlug(serviceSlug);
  const location = getLocationBySlug(locationSlug);

  if (!service || !location) {
    return {};
  }

  const title = buildTitle(`${service.name} in ${location.name}`);
  const description = `${service.name} in ${location.name}, ${location.region}. ${service.shortDescription}`;
  const url = absoluteUrl(`/${service.slug}/${location.slug}`);

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: "article",
    },
  };
}

export default async function CombinedSeoPage({ params }: CombinedPageParams) {
  const { service: serviceSlug, location: locationSlug } = await params;
  const service = getServiceBySlug(serviceSlug);
  const location = getLocationBySlug(locationSlug);

  if (!service || !location) {
    notFound();
  }

  const schema = serviceSchema(service, location);

  return (
    <>
      <SchemaScript schema={schema} />
      <section className="section-space bg-surface-ocean">
        <div className="page-shell">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">Local Premium Care</p>
          <h1 className="mt-2 text-4xl font-semibold">
            {service.name} in {location.name}
          </h1>
          <p className="mt-4 max-w-3xl text-base text-muted-foreground">
            {service.longDescription} Expect meticulous dockside workmanship, premium marine products, and consistent high-end results in {location.name}, {location.region}.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <Link href="/quote" className="rounded-full bg-primary px-4 py-1 text-primary-foreground">
              Request premium quote
            </Link>
            <Link href={`/services/${service.slug}`} className="rounded-full border border-border bg-card px-4 py-1">
              View service details
            </Link>
            <Link href={`/locations/${location.slug}`} className="rounded-full border border-border bg-card px-4 py-1">
              View location coverage
            </Link>
          </div>
        </div>
      </section>

      <InternalLinkGrid
        title="More services in this location"
        items={services
          .filter((item) => item.slug !== service.slug)
          .map((item) => ({
            href: `/${item.slug}/${location.slug}`,
            title: `${item.name} in ${location.name}`,
            description: item.shortDescription,
          }))}
      />

      <InternalLinkGrid
        title={`More locations for ${service.name}`}
        items={locations
          .filter((item) => item.slug !== location.slug)
          .map((item) => ({
            href: `/${service.slug}/${item.slug}`,
            title: `${service.name} in ${item.name}`,
            description: item.shortDescription,
          }))}
      />
    </>
  );
}

export const dynamicParams = false;
export const dynamic = "force-static";
