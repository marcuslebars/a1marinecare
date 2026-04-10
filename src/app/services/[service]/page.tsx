import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Sparkles, Shield, Star, Clock, Award, MapPin, Users, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
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

const COMPANION_SERVICE_BENEFITS: Record<string, { headline: string; benefits: string[] }> = {
  "gelcoat-restoration": {
    headline: "Restore Factory Gloss & Remove Oxidation",
    benefits: [
      "Eliminates chalky, weathered gelcoat permanently",
      "Multi-stage compounding returns original depth and clarity",
      "Foundation for ceramic or wax protection",
    ],
  },
  "ceramic-coating": {
    headline: "Season-Long Protection with Hydrophobic Shine",
    benefits: [
      "Repels water, salt, and environmental contaminants",
      "UV and oxidation barrier preserves gelcoat colour",
      "Reduces future washing time by up to 50%",
    ],
  },
  "interior-detailing": {
    headline: "Cabin Comfort & Vinyl Longevity",
    benefits: [
      "Removes mould, mildew, and odours at the source",
      "Conditions and protects vinyl from UV cracking",
      "Leaves cabin ready for next season's first outing",
    ],
  },
  "wash-and-wax": {
    headline: "Peak-Season Presentation Maintenance",
    benefits: [
      "Removes salt, algae, and waterline stains",
      "Premium carnauba or synthetic wax adds deep warmth",
      "Protects gelcoat between full detailing cycles",
    ],
  },
};

const PREMIUM_LOCATION_NAMES = ["georgian-bay", "midland", "muskoka", "lake-simcoe", "parry-sound", "honey-harbour"];

const BEFORE_AFTER_IMAGES = [
  { src: "/images/before-after/results-candidate-1.jpg", label: "Before" },
  { src: "/images/before-after/results-candidate-2.png", label: "After" },
  { src: "/images/before-after/results-candidate-3.jpg", label: "Before" },
  { src: "/images/before-after/results-candidate-4.jpg", label: "After" },
];

const WHO_THIS_IS_FOR = [
  {
    icon: Award,
    title: "Owners Who Demand a Showroom Finish",
    description: "You take pride in your vessel. You want it to look as good as the day it left the showroom.",
  },
  {
    icon: Sparkles,
    title: "Boats with Dull or Oxidized Gelcoat",
    description: "Season after season, UV and salt rob your gelcoat of its original lustre. We bring it back.",
  },
  {
    icon: Zap,
    title: "Preparing for Peak Season or a Sale",
    description: "Whether you're launching, selling, or hosting guests—your boat deserves to make an entrance.",
  },
  {
    icon: Shield,
    title: "High-Value Vessels Worth Proper Care",
    description: "You understand that premium boats need premium care. You want specialists, not generalists.",
  },
];

export default async function ServicePage({ params }: ServicePageParams) {
  const { service: serviceSlug } = await params;
  const service = getServiceBySlug(serviceSlug);

  if (!service) {
    notFound();
  }

  const schema = serviceSchema(service);
  const companionBenefits = COMPANION_SERVICE_BENEFITS[service.slug];
  const premiumLocations = locations.filter((l) => PREMIUM_LOCATION_NAMES.includes(l.slug));
  const otherLocations = locations.filter((l) => !PREMIUM_LOCATION_NAMES.includes(l.slug));

  return (
    <>
      <SchemaScript schema={schema} />

      {/* HERO */}
      <section className="section-space bg-surface-ocean">
        <div className="page-shell">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-12">
            <div className="flex-1">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">Premium Marine Detailing</p>
              <h1 className="mt-2 text-4xl lg:text-5xl font-semibold leading-tight">
                Restore Deep Gloss.<br />Turn Heads at the Dock.
              </h1>
              <p className="mt-4 max-w-2xl text-base text-muted-foreground">
                Professional boat detailing for owners who expect their vessel to stand out. We deliver the finish your boat deserves—dockside, on your schedule.
              </p>
              <div className="mt-6 flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1">
                  <Star className="w-3.5 h-3.5 text-primary" />
                  From ${service.basePriceFrom} CAD
                </span>
                <span className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  {service.duration}
                </span>
              </div>
              <div className="mt-8 flex flex-wrap gap-4">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/quote">
                    Get Your Quote <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="gap-2">
                  <Link href="/booking">
                    Reserve Your Spot <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </div>
            {service.slug === "boat-detailing" && (
              <div className="mt-8 lg:mt-0 lg:w-[480px]">
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border/50 shadow-2xl">
                  <Image
                    src="/images/services/exterior-detailing.jpg"
                    alt={`${service.name} in progress`}
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* MICRO-PROOF STRIP */}
      <section className="border-y border-border/50 bg-card/30">
        <div className="page-shell py-4">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            <div className="flex items-center gap-2 text-sm">
              <Star className="w-4 h-4 fill-primary text-primary" />
              <span className="font-semibold">5.0</span>
              <span className="text-muted-foreground">average rating</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-primary" />
              <span className="font-semibold">500+</span>
              <span className="text-muted-foreground">boats detailed</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-semibold">Fully Mobile</span>
              <span className="text-muted-foreground">dockside service</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Georgian Bay, Muskoka, Lake Simcoe</span>
            </div>
          </div>
        </div>
      </section>

      {/* WHO THIS IS FOR */}
      {service.slug === "boat-detailing" && (
        <section className="py-14 bg-background">
          <div className="page-shell">
            <h2 className="text-2xl font-semibold text-center mb-10">Who This Service Is For</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {WHO_THIS_IS_FOR.map((item, i) => (
                <div key={i} className="text-center p-6 rounded-xl border border-border/50 bg-card/30 hover:bg-card/60 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* VISUAL PROOF - for boat-detailing */}
      {service.slug === "boat-detailing" && (
        <section className="py-16 bg-surface-ocean">
          <div className="page-shell">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-semibold">Real Results. Visible Transformation.</h2>
              <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                From oxidized gelcoat to deep, mirror-like gloss. This is the difference professional detailing makes.
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {BEFORE_AFTER_IMAGES.map((img, i) => (
                <div key={i} className="relative">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border/50 shadow-lg">
                    <Image
                      src={img.src}
                      alt={`Boat ${img.label.toLowerCase()} detailing`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  </div>
                  <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold ${img.label === 'Before' ? 'bg-red-500/80 text-white' : 'bg-green-500/80 text-white'}`}>
                    {img.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* MID-PAGE CTA */}
      <section className="py-16 bg-gradient-to-b from-primary/5 to-primary/10 border-y border-primary/20">
        <div className="page-shell text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Award className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Takes Less Than a Minute</span>
          </div>
          <h2 className="text-3xl font-semibold">Get Your Premium Detail Quote</h2>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
            Tell us about your vessel. We'll prepare a transparent, detailed quote with no obligation.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="gap-2">
              <Link href="/quote">
                Get Your Quote <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link href="/booking">
                Reserve Your Spot <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* PREMIUM LOCATIONS */}
      <section className="section-space">
        <div className="page-shell">
          <h2 className="text-2xl font-semibold md:text-3xl">Service Area</h2>
          <p className="mt-2 text-muted-foreground">Premium dockside detailing across Ontario's finest waterways</p>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {premiumLocations.map((location) => (
              <Link
                key={location.slug}
                href={`/${service.slug}/${location.slug}`}
                className="group text-center p-4 rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/50 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <p className="font-semibold text-foreground">{location.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{location.region}</p>
              </Link>
            ))}
          </div>
          {otherLocations.length > 0 && (
            <details className="mt-6 group">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-primary transition-colors list-none flex items-center gap-2">
                <span>View all {locations.length} service locations</span>
                <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-4 flex flex-wrap gap-2">
                {otherLocations.map((location) => (
                  <Link
                    key={location.slug}
                    href={`/${service.slug}/${location.slug}`}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {location.name}
                  </Link>
                ))}
              </div>
            </details>
          )}
        </div>
      </section>

      {/* UPGRADED COMPANION SERVICES */}
      {companionBenefits && (
        <section className="section-space bg-surface-ocean">
          <div className="page-shell">
            <h2 className="text-2xl font-semibold md:text-3xl">Complete the Detail</h2>
            <p className="mt-2 text-muted-foreground">Popular add-ons to maximise your boat's protection and appearance</p>
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {services
                .filter((item) => item.slug !== service.slug)
                .map((item) => {
                  const benefits = COMPANION_SERVICE_BENEFITS[item.slug];
                  return (
                    <Link
                      key={item.slug}
                      href={`/services/${item.slug}`}
                      className="group surface-panel bg-gradient-to-b from-card to-card/80 p-6 rounded-2xl border border-border hover:border-primary/50 transition-all duration-300 hover:-translate-y-1"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-semibold">{item.name}</h3>
                        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                      {benefits ? (
                        <>
                          <p className="text-sm font-medium text-primary mb-3">{benefits.headline}</p>
                          <ul className="space-y-2">
                            {benefits.benefits.map((benefit, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">{item.shortDescription}</p>
                      )}
                      <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-2 text-sm text-muted-foreground">
                        <Shield className="w-4 h-4" />
                        From ${item.basePriceFrom}
                      </div>
                    </Link>
                  );
                })}
            </div>
          </div>
        </section>
      )}

      {/* FINAL CTA */}
      <section className="py-16 bg-[#03111c] text-white">
        <div className="page-shell text-center">
          <h2 className="text-3xl font-semibold">Ready to Transform Your Vessel?</h2>
          <p className="mt-3 text-slate-300 max-w-lg mx-auto">
            Secure your preferred service date before the season fills up. Your boat deserves it.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="gap-2 bg-white text-[#03111c] hover:bg-slate-100">
              <Link href="/quote">
                Get Your Quote <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2 border-white/30 text-white hover:bg-white/10">
              <Link href="/booking">
                Reserve Your Spot <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
