import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Sparkles, Shield, Star, Clock, Award, MapPin, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SchemaScript } from "@/components/site/schema-script";
import { getServiceBySlug, locations, services } from "@/content/site";
import { getServiceStartingPriceLabel } from "@/lib/quote-pricing";
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

const SERVICE_IMAGES: Record<string, string> = {
  "boat-detailing": "/images/services/exterior-detailing.jpg",
  "gelcoat-restoration": "/images/services/gelcoat-restoration.jpg",
  "ceramic-coating": "/images/services/ceramic-coating.jpg",
  "interior-detailing": "/images/services/interior-detailing.jpg",
  "graphene-coating": "/images/services/ceramic-coating.jpg",
  "wet-sanding": "/images/services/gelcoat-restoration.jpg",
  "bottom-painting": "/images/services/bottom-painting.jpg",
  "vinyl-removal": "/images/services/vinyl-removal.jpg",
};

const SERVICE_HERO_CONTENT: Record<string, { eyebrow: string; headline: string; subline: string }> = {
  "boat-detailing": {
    eyebrow: "Exterior Detailing",
    headline: "Restore Deep Gloss.",
    subline: "Professional boat detailing for owners who expect their vessel to stand out. We deliver the finish your boat deserves—dockside, on your schedule.",
  },
  "gelcoat-restoration": {
    eyebrow: "Gelcoat Restoration",
    headline: "Bring Back the original shine.",
    subline: "Multi-stage correction that reverses weathering, removes oxidation, and recovers the depth and clarity your gelcoat had when it left the showroom.",
  },
  "ceramic-coating": {
    eyebrow: "Ceramic Coating",
    headline: "Protection That Lasts All Season.",
    subline: "Marine-grade ceramic coating that improves gloss, reduces wash effort, and provides season-long UV and environmental protection for your hull.",
  },
  "interior-detailing": {
    eyebrow: "Interior Detailing",
    headline: "Cabin Comfort, Fresh from Bow to Stern.",
    subline: "Complete interior reset including vinyl treatment, carpet extraction, mould-prone area targeting, and fresh detailing for a cabin that's ready to enjoy.",
  },
  "graphene-coating": {
    eyebrow: "Graphene Nano Coating",
    headline: "Next-Level Surface Protection.",
    subline: "Advanced graphene-based ceramic coating offering superior hardness, enhanced UV resistance, and water-beading that outperforms standard ceramic options.",
  },
  "wet-sanding": {
    eyebrow: "Wet Sanding & Paint Correction",
    headline: "Show-Car Precision for Your Hull.",
    subline: "Progressive wet sanding combined with multi-stage machine polishing to remove deep oxidation, scratches, and swirl marks that compound work can't fix.",
  },
  "bottom-painting": {
    eyebrow: "Bottom Painting",
    headline: "Protect the Hull Below the Waterline.",
    subline: "Professional anti-fouling bottom paint application using premium coatings to shield your hull from marine growth, algae, and zebra mussels all season.",
  },
  "vinyl-removal": {
    eyebrow: "Vinyl Removal & Installation",
    headline: "Custom Graphics That Make a Statement.",
    subline: "Complete vinyl services including safe removal of old graphics, expert surface preparation, and professional installation of new striping, names, and decorative elements.",
  },
};

const COMPANION_SERVICE_BENEFITS: Record<string, { headline: string; benefits: string[] }> = {
  "boat-detailing": {
    headline: "Complete Exterior Care",
    benefits: [
      "Removes salt, algae, and waterline staining",
      "Wash, clay bar, and hand polish with sealant",
      "Protects gelcoat between full correction cycles",
    ],
  },
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
  "graphene-coating": {
    headline: "Superior Durability & Heat Resistance",
    benefits: [
      "Graphene matrix outperforms standard ceramic coatings",
      "Enhanced resistance to micro-scratching and swirl marks",
      "Superior water-beading and self-cleaning effect",
    ],
  },
  "wet-sanding": {
    headline: "Precision Correction for Severe Defects",
    benefits: [
      "Removes deep scratches unfixable by compounding alone",
      "Progressive wet sanding stages for safe material removal",
      "Multi-stage polishing restores mirror finish after sanding",
    ],
  },
  "bottom-painting": {
    headline: "Season-Long Hull Protection",
    benefits: [
      "Premium anti-fouling coatings prevent marine growth",
      "Reduces drag and maintains hull efficiency",
      "Protects against zebra mussels and algae buildup",
    ],
  },
  "vinyl-removal": {
    headline: "Professional Vinyl Craftsmanship",
    benefits: [
      "Safe removal of old graphics without damaging gelcoat",
      "Expert surface preparation for flawless new installation",
      "Custom design consultation and professional application",
    ],
  },
};

const BEFORE_AFTER_IMAGES = [
  { src: "/images/before-after/results-candidate-1.jpg", label: "Before" },
  { src: "/images/before-after/results-candidate-2.png", label: "After" },
  { src: "/images/before-after/results-candidate-3.jpg", label: "Before" },
  { src: "/images/before-after/results-candidate-4.jpg", label: "After" },
];

const SHOW_TRANSFORMATION_SLUGS = ["boat-detailing", "gelcoat-restoration", "ceramic-coating", "wet-sanding"];

export default async function ServicePage({ params }: ServicePageParams) {
  const { service: serviceSlug } = await params;
  const service = getServiceBySlug(serviceSlug);

  if (!service) {
    notFound();
  }

  const schema = serviceSchema(service);
  const heroContent = SERVICE_HERO_CONTENT[service.slug] || {
    eyebrow: service.name,
    headline: service.shortDescription,
    subline: service.longDescription,
  };
  const companionBenefits = COMPANION_SERVICE_BENEFITS[service.slug];
  const heroImage = SERVICE_IMAGES[service.slug];
  const showTransformation = SHOW_TRANSFORMATION_SLUGS.includes(service.slug);
  const visibleLocations = locations.slice(0, 4);
  const hiddenLocations = locations.slice(4);

  return (
    <>
      <SchemaScript schema={schema} />

      {/* HERO - Full-width cinematic */}
      <section className="relative min-h-[85vh] flex items-center bg-surface-ocean overflow-hidden">
        <div className="absolute inset-0">
          {heroImage && (
            <Image
              src={heroImage}
              alt={`${service.name} - ${heroContent.headline}`}
              fill
              className="object-cover object-center"
              priority
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#03111c]/95 via-[#03111c]/80 to-[#03111c]/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#03111c]/50 to-transparent" />
        </div>
        <div className="page-shell relative z-10 py-24 lg:py-32">
          <div className="max-w-xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary/80 mb-4">
              {heroContent.eyebrow}
            </p>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight text-white">
              {heroContent.headline}
              <br />
              <span className="text-primary">Turn Heads</span> at the Dock.
            </h1>
            <p className="mt-6 text-lg text-white/70 leading-relaxed max-w-lg">
              {heroContent.subline}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <span className="inline-flex items-center gap-2.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-5 py-2.5 text-sm font-medium text-white">
                <Star className="w-4 h-4 text-primary" />
                {getServiceStartingPriceLabel(service.slug)}
              </span>
              <span className="inline-flex items-center gap-2.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-5 py-2.5 text-sm font-medium text-white">
                <Clock className="w-4 h-4 text-primary" />
                {service.duration}
              </span>
            </div>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button asChild size="lg" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/quote">
                  Get Your Quote <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button asChild variant="heroOutline" size="lg" className="gap-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50">
                <Link href="/booking">
                  Reserve Your Spot <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="bg-[#03111c]/95 backdrop-blur-md border-y border-white/10">
        <div className="page-shell py-6">
          <div className="flex flex-wrap items-center justify-center gap-12 lg:gap-20">
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 fill-primary text-primary" />
              <span className="text-xl font-semibold text-white">5.0</span>
              <span className="text-sm text-white/50">average rating</span>
            </div>
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-primary" />
              <span className="text-xl font-semibold text-white">500+</span>
              <span className="text-sm text-white/50">boats detailed</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-primary" />
              <span className="text-xl font-semibold text-white">Fully Mobile</span>
              <span className="text-sm text-white/50">dockside service</span>
            </div>
          </div>
        </div>
      </section>

      {/* VISUAL PROOF - Transformation section (only for relevant services) */}
      {showTransformation && (
        <section className="py-24 bg-[#03111c]">
          <div className="page-shell">
            <div className="text-center mb-16">
              <p className="text-sm font-medium uppercase tracking-[0.15em] text-primary/80 mb-3">See the Difference</p>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Real Results. Visible Transformation.</h2>
              <p className="mt-4 text-white/60 max-w-xl mx-auto text-lg">
                From oxidized gelcoat to deep, mirror-like gloss. This is the difference professional detailing makes.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {BEFORE_AFTER_IMAGES.map((img, i) => (
                <div
                  key={i}
                  className={`relative ${i % 2 === 1 ? "md:mt-16" : ""}`}
                >
                  <div className="relative aspect-[16/10] overflow-hidden rounded-2xl shadow-2xl shadow-black/30">
                    <Image
                      src={img.src}
                      alt={`Boat ${img.label.toLowerCase()} detailing`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                  <div className={`absolute top-4 left-4 px-4 py-1.5 rounded-full text-sm font-semibold backdrop-blur-sm ${
                    img.label === "Before"
                      ? "bg-red-500/90 text-white"
                      : "bg-emerald-500/90 text-white"
                  }`}>
                    {img.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SERVICE DESCRIPTION */}
      <section className="py-24 bg-background">
        <div className="page-shell">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-sm font-medium uppercase tracking-[0.15em] text-primary/80 mb-3">About This Service</p>
            <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-6">{service.name}</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">{service.longDescription}</p>
          </div>
        </div>
      </section>

      {/* MID-PAGE CTA */}
      <section className="py-24 bg-gradient-to-b from-[#03111c] to-surface-ocean">
        <div className="page-shell text-center">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Award className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Takes Less Than a Minute</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold">Get Your {service.name} Quote</h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto text-lg">
            Tell us about your vessel. We&apos;ll prepare a transparent, detailed quote with no obligation.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
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
      <section className="py-24 bg-background">
        <div className="page-shell">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-3">Service Area</h2>
            <p className="text-muted-foreground text-lg">Premium dockside detailing across Ontario&apos;s finest waterways</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {visibleLocations.map((location) => (
              <Link
                key={location.slug}
                href={`/${service.slug}/${location.slug}`}
                className="group p-8 rounded-2xl bg-card/80 hover:bg-card border border-transparent hover:border-primary/30 transition-all duration-500 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <p className="text-lg font-semibold text-foreground">{location.name}</p>
                <p className="text-sm text-muted-foreground mt-1">{location.region}</p>
              </Link>
            ))}
          </div>
          {hiddenLocations.length > 0 && (
            <details className="mt-8 group">
              <summary className="cursor-pointer text-center text-sm text-muted-foreground hover:text-primary transition-colors list-none flex items-center justify-center gap-2">
                <span>View all {locations.length} service locations</span>
                <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {hiddenLocations.map((location) => (
                  <Link
                    key={location.slug}
                    href={`/${service.slug}/${location.slug}`}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-full bg-card/50 hover:bg-card border border-border/50"
                  >
                    {location.name}
                  </Link>
                ))}
              </div>
            </details>
          )}
        </div>
      </section>

      {/* COMPANION SERVICES */}
      {companionBenefits && (
        <section className="py-24 bg-surface-ocean">
          <div className="page-shell">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-semibold text-white mb-3">Complete the Detail</h2>
              <p className="text-white/60 text-lg">Popular add-ons to maximise your boat&apos;s protection and appearance</p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {services
                .filter((item) => item.slug !== service.slug)
                .map((item) => {
                  const benefits = COMPANION_SERVICE_BENEFITS[item.slug];
                  return (
                    <Link
                      key={item.slug}
                      href={`/services/${item.slug}`}
                      className="group p-8 rounded-2xl bg-gradient-to-b from-card/90 to-card/60 backdrop-blur-sm border border-white/10 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-1"
                    >
                      <div className="flex items-start justify-between mb-5">
                        <h3 className="text-xl font-semibold text-foreground">{item.name}</h3>
                        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                      </div>
                      {benefits ? (
                        <>
                          <p className="text-sm font-medium text-primary mb-4">{benefits.headline}</p>
                          <ul className="space-y-3">
                            {benefits.benefits.map((benefit, i) => (
                              <li key={i} className="flex items-start gap-3 text-sm text-white/70">
                                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <p className="text-sm text-white/60">{item.shortDescription}</p>
                      )}
                      <div className="mt-6 pt-5 border-t border-white/10 flex items-center gap-2 text-sm text-white/50">
                        <Shield className="w-4 h-4" />
                        {getServiceStartingPriceLabel(item.slug)}
                      </div>
                    </Link>
                  );
                })}
            </div>
          </div>
        </section>
      )}

      {/* FINAL CTA */}
      <section className="py-24 bg-[#03111c] text-white">
        <div className="page-shell text-center">
          <h2 className="text-4xl md:text-5xl font-bold">Ready to Transform Your Vessel?</h2>
          <p className="mt-4 text-white/60 max-w-lg mx-auto text-lg">
            Secure your preferred service date before the season fills up. Your boat deserves it.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/quote">
                Get Your Quote <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="heroOutline" size="lg" className="gap-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50">
              <Link href="/booking">
                Reserve Your Spot <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2 border-white/20 bg-white/5 text-white hover:border-white/40 hover:bg-white/10">
              <Link href="/preview">
                Preview Your Boat <Sparkles className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
