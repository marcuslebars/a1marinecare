import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Scan } from "lucide-react";

import { TransformationSlider } from "@/components/transformation-slider";
import { GoogleReviewsSection } from "@/components/site/google-reviews";
import { Button } from "@/components/ui/button";
import { services } from "@/content/site";

const FEATURED_SERVICE_SLUGS = ["boat-detailing", "gelcoat-restoration", "ceramic-coating", "interior-detailing"] as const;

const SERVICE_IMAGES: Record<string, string> = {
  "boat-detailing": "/images/services/exterior-detailing-home.png",
  "gelcoat-restoration": "/images/services/gelcoat-restoration.jpg",
  "ceramic-coating": "/images/services/ceramic-coating.jpg",
  "interior-detailing": "/images/services/interior-detailing.jpg",
};

const featuredServices = FEATURED_SERVICE_SLUGS.map((slug) => services.find((service) => service.slug === slug)).filter(
  (service): service is (typeof services)[number] => Boolean(service)
);

const whyA1Points = [
  "No drop-offs, no waiting around. We come right to your marina, private slip, or property - whenever works for you.",
  "We have spent years working on high-value vessels that can't afford shortcuts. You get that experience every single time.",
  "Everything we do is built around lasting results. Deep gloss, real protection, and a finish that holds up all season.",
  "We've earned the trust of boat owners across Georgian Bay, Lake Simcoe, and Muskoka. Chances are, your neighbour's already a client.",
];

export default function HomePage() {
  return (
    <>
      <section className="relative flex min-h-screen items-center overflow-hidden bg-black">
        <Image
          src="/images/marinas/marina-3.jpg"
          alt="Premium boats docked in a marina in Georgian Bay"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-black/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/10" />

        <div className="page-shell relative z-10 flex min-h-screen items-center justify-center py-20 md:py-24">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-base font-medium uppercase tracking-[0.24em] text-white/78 md:text-lg">A1 Marine Care</p>
            <h1 className="mx-auto mt-6 max-w-3xl text-6xl font-black leading-[0.92] text-white sm:text-7xl md:text-8xl lg:text-[6.5rem]">
              Premium Boat Detailing in Georgian Bay
            </h1>
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-white/78 md:text-xl md:leading-9">
              High-end dockside detailing, restoration, and protection for owners who want a clean finish and a sharp first impression all season.
            </p>
            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" className="h-16 min-w-[220px] px-10 text-lg font-semibold">
                <Link href="/quote">Request a Quote</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-16 min-w-[220px] border-white/30 bg-white/5 px-10 text-lg font-semibold text-white hover:border-white/60 hover:bg-white/10 hover:text-white"
              >
                <Link href="/booking">Reserve Your Date</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-black py-8 md:py-10">
        <div className="page-shell">
          <div className="max-w-5xl mx-auto text-center">
            <div className="flex flex-col items-center justify-center gap-8 md:flex-row md:gap-16">
              <div className="space-y-1">
                <p className="text-3xl font-black text-white md:text-4xl">500+</p>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">Boats Detailed</p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-black text-white md:text-4xl">5+</p>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">Years Experience</p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-black text-white md:text-4xl">5.0</p>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">Google Rating</p>
              </div>
            </div>
            <p className="mt-8 text-xl font-black uppercase tracking-[0.14em] text-white md:text-2xl">
              Georgian Bay | Lake Simcoe | Muskoka
            </p>
            <p className="mt-4 text-base italic leading-7 text-white/65 md:text-lg">
              Five years. Five stars. Five hundred boats and counting.
              <br className="hidden md:block" />
              We come to you, and we don&apos;t leave until it&apos;s right.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-black py-20 md:py-28">
        <div className="mb-10 px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">Transformation</p>
          <h2 className="mt-4 text-4xl font-black text-white md:text-6xl">From dull to mirror finish.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/60 md:text-lg">
            A clearer side-by-side comparison that shows exactly how the finish changes after correction, polishing, and protection.
          </p>
        </div>

        <div className="space-y-5">
          <TransformationSlider />

          <div className="grid gap-5 md:grid-cols-2">
            <div className="relative aspect-[4/3] overflow-hidden bg-neutral-950">
              <Image
                src="/images/before-after/cobalt-back-before.webp"
                alt="Cobalt stern panel before detailing with oxidation, haze, and reduced clarity"
                fill
                className="object-cover brightness-[0.72] contrast-[0.94] saturate-[0.76]"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/84 via-black/28 to-black/10" />
              <div className="absolute left-4 top-4 rounded-full border border-white/35 bg-black/88 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-white shadow-[0_12px_30px_rgba(0,0,0,0.45)] backdrop-blur-sm">
                Before
              </div>
              <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                <p className="inline-flex rounded-full border border-white/20 bg-black/78 px-4 py-2 text-sm font-bold uppercase tracking-[0.16em] text-white shadow-[0_12px_30px_rgba(0,0,0,0.42)] backdrop-blur-sm">
                  Oxidized finish
                </p>
              </div>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden bg-neutral-950">
              <Image
                src="/images/before-after/cobalt-back-after.webp"
                alt="Cobalt stern panel after polishing with deep gloss and sharp reflection"
                fill
                className="object-cover brightness-[1.02] contrast-[1.12] saturate-[1.04]"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/74 via-black/20 to-transparent" />
              <div className="absolute left-4 top-4 rounded-full border border-white/45 bg-black/76 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-white shadow-[0_12px_30px_rgba(0,0,0,0.4)] backdrop-blur-sm">
                After
              </div>
              <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                <p className="inline-flex rounded-full border border-white/28 bg-black/72 px-4 py-2 text-sm font-bold uppercase tracking-[0.16em] text-white shadow-[0_12px_30px_rgba(0,0,0,0.38)] backdrop-blur-sm">
                  Mirror gloss
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-neutral-950 py-20 md:py-28">
        <div className="page-shell">
          <div className="mb-10 text-center md:mb-14">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">Core Services</p>
            <h2 className="mt-4 text-4xl font-black text-white md:text-5xl">Focused services for boats that need to look exceptional.</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {featuredServices.map((service) => (
              <Link
                key={service.slug}
                href={`/services/${service.slug}`}
                className="group relative aspect-[16/11] overflow-hidden rounded-[1.75rem] bg-black"
              >
                <Image
                  src={SERVICE_IMAGES[service.slug]}
                  alt={service.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/28 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                  <h3 className="text-2xl font-black text-white md:text-3xl">{service.name}</h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-white/68">{service.shortDescription}</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Button asChild variant="outline" size="lg" className="h-12 border-white/15 bg-transparent px-8 text-white hover:bg-white/5 hover:text-white">
              <Link href="/services">
                View All Services <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-black py-20 md:py-28">
        <div className="page-shell grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">WHY CHOOSE A1?</p>
            <h2 className="mt-4 max-w-xl text-4xl font-black text-white md:text-5xl">We show up, do the work, and leave your boat looking exactly how it should.</h2>
          </div>

          <div className="space-y-8">
            {whyA1Points.map((point, index) => (
              <div key={point} className="border-b border-white/10 pb-8 last:border-b-0 last:pb-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">0{index + 1}</p>
                <p className="mt-3 max-w-2xl text-lg leading-8 text-white/78">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <GoogleReviewsSection />

      <section className="bg-black py-24 md:py-32">
        <div className="page-shell text-center">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/60">Ready for the season</p>
            <h2 className="mx-auto mt-4 max-w-4xl text-4xl font-black leading-tight text-white md:text-6xl">
              Get your boat looking right this season.
            </h2>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:flex-wrap">
              <Button asChild size="lg" className="h-14 px-10 text-base font-semibold">
                <Link href="/quote">Request a Quote</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-14 px-10 text-base font-semibold border-white/30 bg-white/5 text-white hover:border-white/60 hover:bg-white/10 hover:text-white"
              >
                <Link href="/preview">Preview Your Boat&apos;s Potential</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-14 px-10 text-base font-semibold border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                <Link href="/condition-report">
                  <Scan className="mr-2 h-4 w-4" />
                  Condition Report
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-black py-20 md:py-28">
        <div className="absolute inset-0">
          <Image
            src="/images/marinas/service-area-bg.jpg"
            alt="Luxury boats docked at a marina in the service area"
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/55" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/40 to-black/70" />
        </div>
        <div className="page-shell relative z-10 text-center">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/65">Service Area</p>
            <h2 className="mt-4 text-4xl font-black leading-tight text-white md:text-6xl">
              Serving Georgian Bay, Muskoka, and Lake Simcoe
            </h2>
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg" className="h-12 px-8 text-base font-semibold">
                <Link href="/locations">View All Locations</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
