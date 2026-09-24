import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ShrinkWrapLanding } from "@/components/shrink-wrap/shrink-wrap-landing";
import { GoogleReviewsSection } from "@/components/site/google-reviews";
import { Button } from "@/components/ui/button";
import { services } from "@/content/site";
import { absoluteUrl } from "@/lib/seo";
import { formatCents, SHRINK_WRAP } from "@/lib/shrink-wrap-pricing";

// FALL MODE. The homepage is the shrink-wrap offer for the season; detailing
// and coatings sit below as a short reminder. When wrap season closes, swap
// this file back to the detailing-first version in git history
// (`git show <pre-fall-commit>:src/app/page.tsx`).

const title = "Mobile Boat Shrink Wrapping & Detailing — Georgian Bay | A1 Marine Care";
const description = `Mobile boat shrink wrap at your driveway, trailer, or storage lot — ${formatCents(SHRINK_WRAP.rateCents)}/ft, ${formatCents(SHRINK_WRAP.minimumCents)} minimum, winterization in the same visit. Plus premium mobile detailing and ceramic coatings across Georgian Bay, Lake Simcoe & Muskoka.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    title,
    description,
    url: absoluteUrl("/"),
    type: "website",
    images: [{ url: absoluteUrl("/images/services/shrink-wrapping.jpg"), width: 768, height: 796, alt: "Boat shrink wrapping by A1 Marine Care" }],
  },
};

const FEATURED_SERVICE_SLUGS = ["boat-detailing", "gelcoat-restoration", "ceramic-coating", "interior-detailing"] as const;

const SERVICE_IMAGES: Record<string, string> = {
  "boat-detailing": "/images/services/exterior-detailing-home.png",
  "gelcoat-restoration": "/images/services/gelcoat-restoration.jpg",
  "ceramic-coating": "/images/services/ceramic-coating.jpg",
  "interior-detailing": "/images/services/interior-detailing.jpg",
};

const featuredServices = FEATURED_SERVICE_SLUGS.map((slug) => services.find((service) => service.slug === slug)).filter(
  (service): service is (typeof services)[number] => Boolean(service),
);

export default function HomePage() {
  return (
    <>
      <ShrinkWrapLanding variant="home" />

      {/* DETAILING & COATINGS — still on through the fall */}
      <section className="border-t border-white/10 bg-black py-20 md:py-24">
        <div className="page-shell">
          <div className="mb-10 grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">Also this fall</p>
              <h2 className="mt-3 text-3xl font-black text-white md:text-5xl">Wrap it clean. Detailing &amp; coatings before it goes under.</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/70">
                A fall detail before the wrap goes on means no baked-on grime in spring, and a ceramic coat cures perfectly under
                cover all winter. Same crew, same visit if you want it.
              </p>
            </div>
            <Button asChild variant="outline" size="lg" className="h-12 border-white/15 bg-transparent px-8 text-white hover:bg-white/5 hover:text-white">
              <Link href="/services">
                All detailing services <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredServices.map((service) => (
              <Link
                key={service.slug}
                href={`/services/${service.slug}`}
                className="group relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-neutral-950"
              >
                <Image
                  src={SERVICE_IMAGES[service.slug]}
                  alt={service.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <h3 className="text-xl font-black text-white">{service.name}</h3>
                  <p className="mt-2 text-xs leading-5 text-white/70">{service.shortDescription}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <GoogleReviewsSection />
    </>
  );
}
