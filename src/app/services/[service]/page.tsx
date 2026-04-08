import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { InternalLinkGrid } from "@/components/site/internal-link-grid";
import { SchemaScript } from "@/components/site/schema-script";
import { getServiceBySlug, locations, services } from "@/content/site";
import { absoluteUrl, buildDescription, buildTitle } from "@/lib/seo";
import { serviceSchema } from "@/lib/schema";

type ServicePageParams = {
  params: Promise<{ service: string }>;
};

export async function generateStaticParams() {
  return services.map((service) => ({ service: service.slug }));
}

export async function generateMetadata({ params }: ServicePageParams): Promise<Metadata> {
  const { service: serviceSlug } = await params;
  const service = getServiceBySlug(serviceSlug);

  if (!service) {
    return {};
  }

  const title = buildTitle(service.name);
  const description = buildDescription(service.shortDescription);

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/services/${service.slug}`),
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/services/${service.slug}`),
      type: "article",
    },
  };
}

export default async function ServicePage({ params }: ServicePageParams) {
  const { service: serviceSlug } = await params;
  const service = getServiceBySlug(serviceSlug);

  if (!service) {
    notFound();
  }

  const schema = serviceSchema(service);

  return (
    <>
      <SchemaScript schema={schema} />
      <section className="section-space bg-surface-ocean">
        <div className="page-shell">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">Premium Service</p>
          <h1 className="mt-2 text-4xl font-semibold">{service.name}</h1>
          <p className="mt-4 max-w-3xl text-base text-muted-foreground">{service.longDescription}</p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <span className="rounded-full border border-border bg-card px-3 py-1">From ${service.basePriceFrom} CAD</span>
            <span className="rounded-full border border-border bg-card px-3 py-1">Estimated {service.duration}</span>
            <Link href="/quote" className="rounded-full bg-primary px-4 py-1 text-primary-foreground">
              Request premium quote
            </Link>
          </div>
        </div>
      </section>

      <InternalLinkGrid
        title="Available in your marina area"
        items={locations.map((location) => ({
          href: `/${service.slug}/${location.slug}`,
          title: `${service.name} in ${location.name}`,
          description: `${service.shortDescription} Trusted mobile service in ${location.name}.`,
        }))}
      />

      <InternalLinkGrid
        title="Popular companion services"
        items={services
          .filter((item) => item.slug !== service.slug)
          .map((item) => ({
            href: `/services/${item.slug}`,
            title: item.name,
            description: item.shortDescription,
          }))}
      />
    </>
  );
}
