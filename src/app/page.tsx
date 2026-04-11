import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { services } from "@/content/site";

const FEATURED_SERVICE_SLUGS = ["boat-detailing", "gelcoat-restoration", "ceramic-coating", "interior-detailing"] as const;

const SERVICE_IMAGES: Record<string, string> = {
  "boat-detailing": "/images/services/exterior-detailing.jpg",
  "gelcoat-restoration": "/images/services/gelcoat-restoration.jpg",
  "ceramic-coating": "/images/services/ceramic-coating.jpg",
  "interior-detailing": "/images/services/interior-detailing.jpg",
};

const featuredServices = FEATURED_SERVICE_SLUGS.map((slug) => services.find((service) => service.slug === slug)).filter(
  (service): service is (typeof services)[number] => Boolean(service)
);

const trustItems = [
  { value: "500+", label: "Boats Detailed" },
  { value: "15+", label: "Years Experience" },
  { value: "5.0", label: "Rating" },
];

const whyA1Points = [
  "Dockside service that meets you at the marina, private slip, or waterfront property.",
  "Hands-on experience caring for high-value vessels that demand precise finish work.",
  "Consistent, high-quality results built around gloss, protection, and long-term upkeep.",
  "Trusted by owners throughout Georgian Bay and surrounding premium boating regions.",
];

export default function HomePage() {
  return (
    <>
      <section className="relative flex min-h-screen items-end overflow-hidden bg-black">
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

        <div className="page-shell relative z-10 flex min-h-screen items-end py-20 md:py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-white/70">A1 Marine Care</p>
            <h1 className="mt-6 max-w-2xl text-5xl font-black leading-[0.95] text-white sm:text-6xl md:text-7xl lg:text-[5.5rem]">
              Premium Boat Detailing in Georgian Bay
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/72 md:text-lg">
              High-end dockside detailing, restoration, and protection for owners who want a clean finish and a sharp first impression all season.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Button asChild size="lg" className="h-14 px-8 text-base font-semibold">
                <Link href="/quote">Request a Quote</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-14 border-white/30 bg-white/5 px-8 text-base font-semibold text-white hover:border-white/60 hover:bg-white/10 hover:text-white"
              >
                <Link href="/booking">Reserve Your Date</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-black py-6 md:py-8">
        <div className="page-shell">
          <div className="flex flex-col items-center justify-center gap-8 text-center md:flex-row md:gap-16 md:text-left">
            {trustItems.map((item) => (
              <div key={item.label} className="space-y-1">
                <p className="text-3xl font-black text-white md:text-4xl">{item.value}</p>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-black py-20 md:py-28">
        <div className="mb-10 px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">Transformation</p>
          <h2 className="mt-4 text-4xl font-black text-white md:text-6xl">From dull to mirror finish.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/60 md:text-lg">
            Real correction work, real gloss, and a finish that changes how the boat reads at the dock.
          </p>
        </div>

        <div className="space-y-4">
          <div className="relative aspect-[16/9] overflow-hidden md:aspect-[21/9]">
            <Image
              src="/images/before-after/results-candidate-4.jpg"
              alt="Restored boat finish with deep gloss after premium detailing"
              fill
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
            <div className="absolute left-4 top-4 rounded-full border border-white/25 bg-black/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white md:left-8 md:top-8">
              After
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src="/images/before-after/results-candidate-1.jpg"
                alt="Boat finish before correction and detailing"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
              <div className="absolute left-4 top-4 rounded-full border border-white/25 bg-black/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                Before
              </div>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden">
              <Image
                src="/images/before-after/results-candidate-2.png"
                alt="Boat surface being polished to a high-gloss finish"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
              <div className="absolute left-4 top-4 rounded-full border border-white/25 bg-black/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                After
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
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Premium Service</p>
                  <h3 className="mt-3 text-2xl font-black text-white md:text-3xl">{service.name}</h3>
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
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">Why A1</p>
            <h2 className="mt-4 max-w-lg text-4xl font-black text-white md:text-5xl">Clean, confident service without the marina runaround.</h2>
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

      <section className="relative overflow-hidden bg-black py-20 md:py-28">
        <div className="absolute inset-0">
          <Image
            src="/images/marinas/marina-1.jpg"
            alt="Premium marina service area in Georgian Bay"
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/45" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/35" />
        </div>

        <div className="page-shell relative z-10">
          <div className="max-w-3xl py-10 md:py-16">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/65">Service Area</p>
            <h2 className="mt-4 text-4xl font-black leading-tight text-white md:text-6xl">
              Serving Georgian Bay, Muskoka, and Lake Simcoe
            </h2>
            <div className="mt-8">
              <Button asChild size="lg" className="h-12 px-8 text-base font-semibold">
                <Link href="/locations">View All Locations</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-black py-24 md:py-32">
        <div className="absolute inset-0">
          <Image
            src="/images/services/exterior-detailing.jpg"
            alt="Boat receiving premium exterior detailing service"
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/55" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/35" />
        </div>

        <div className="page-shell relative z-10 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-white/60">Ready for the season</p>
          <h2 className="mx-auto mt-4 max-w-4xl text-4xl font-black leading-tight text-white md:text-6xl">
            Get your boat looking right this season.
          </h2>
          <div className="mt-8">
            <Button asChild size="lg" className="h-14 px-10 text-base font-semibold">
              <Link href="/quote">Request a Quote</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
