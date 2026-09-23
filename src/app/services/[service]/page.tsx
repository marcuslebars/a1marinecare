import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Sparkles, Shield, Star, Clock, Award, MapPin, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SchemaScript } from "@/components/site/schema-script";
import { TransformationSlider } from "@/components/transformation-slider";
import { getServiceBySlug, getServiceHref, locations, services } from "@/content/site";
import { getServiceStartingPriceLabel as engineStartingPriceLabel } from "@/lib/quote-pricing";
import { SHRINK_WRAP_PRICE_LABEL } from "@/lib/shrink-wrap-pricing";

// Shrink wrap is priced outside the engine for now (see shrink-wrap-pricing.ts).
const getServiceStartingPriceLabel = (slug: string) =>
  slug === "shrink-wrapping" ? SHRINK_WRAP_PRICE_LABEL : engineStartingPriceLabel(slug);
import { absoluteUrl, buildDescription, buildTitle } from "@/lib/seo";
import { serviceSchema } from "@/lib/schema";

type ServicePageParams = {
  params: Promise<{ service: string }>;
};

// /services/shrink-wrapping 301s to /shrink-wrapping (next.config.mjs); the
// generic template never renders it.
const TEMPLATE_SERVICES = services.filter((service) => service.slug !== "shrink-wrapping");

export async function generateStaticParams() {
  return TEMPLATE_SERVICES.map((service) => ({ service: service.slug }));
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

type TransformationImage = {
  src: string;
  label: "Before" | "After";
  alt: string;
};

const DEFAULT_BEFORE_AFTER_IMAGES: TransformationImage[] = [
  { src: "/images/before-after/results-candidate-1.jpg", label: "Before", alt: "Boat before detailing" },
  { src: "/images/before-after/results-candidate-2.png", label: "After", alt: "Boat after detailing" },
  { src: "/images/before-after/results-candidate-3.jpg", label: "Before", alt: "Boat before detailing" },
  { src: "/images/before-after/results-candidate-4.jpg", label: "After", alt: "Boat after detailing" },
];

const TRANSFORMATION_IMAGES_BY_SLUG: Record<string, TransformationImage[]> = {
  "boat-detailing": [
    { src: "/images/before-after/regal-before.jpg", label: "Before", alt: "Regal boat stern before exterior detailing with reduced gloss and visible haze" },
    { src: "/images/before-after/regal-after.jpg", label: "After", alt: "Regal boat stern after exterior detailing with restored gloss and sharp reflections" },
    { src: "/images/before-after/cruisers-before.webp", label: "Before", alt: "Cruisers Yachts hull before exterior detailing with oxidation, staining, and dull finish" },
    { src: "/images/before-after/cruisers-after.webp", label: "After", alt: "Cruisers Yachts hull after exterior detailing with brighter finish and restored reflection" },
  ],
  "gelcoat-restoration": [
    { src: "/images/before-after/regal-before.jpg", label: "Before", alt: "Regal boat stern before gelcoat restoration with reduced gloss and visible haze" },
    { src: "/images/before-after/regal-after.jpg", label: "After", alt: "Regal boat stern after gelcoat restoration with restored gloss and sharp reflections" },
    { src: "/images/before-after/cruisers-before.webp", label: "Before", alt: "Cruisers Yachts hull before gelcoat restoration with oxidation, staining, and dull finish" },
    { src: "/images/before-after/cruisers-after.webp", label: "After", alt: "Cruisers Yachts hull after gelcoat restoration with brighter finish and restored reflection" },
  ],
};

const SHOW_TRANSFORMATION_SLUGS = ["boat-detailing", "gelcoat-restoration", "ceramic-coating", "wet-sanding"];
const SHOW_TRANSFORMATION_SLIDER_SLUGS = ["interior-detailing"];

const TRANSFORMATION_SLIDER_CONTENT: Record<string, {
  beforeImageSrc: string;
  afterImageSrc: string;
  beforeImageAlt: string;
  afterImageAlt: string;
  beforeHeadline: string;
  afterHeadline: string;
  beforeDescription: string;
  afterDescription: string;
}> = {
  "interior-detailing": {
    beforeImageSrc: "/images/before-after/interior-before.webp",
    afterImageSrc: "/images/before-after/interior-after.webp",
    beforeImageAlt: "Boat cockpit seating before interior detailing with visible mildew, staining, and surface buildup",
    afterImageAlt: "Boat cockpit seating after interior detailing with bright, clean vinyl and restored appearance",
    beforeHeadline: "Before Interior Cleaning",
    afterHeadline: "After Interior Detailing",
    beforeDescription: "Embedded mildew, staining, and grime make marine vinyl look neglected and uncomfortable to use.",
    afterDescription: "Targeted cleaning restores a brighter finish, lifts surface contamination, and brings the seating area back to a fresh, ready-to-enjoy condition.",
  },
};

export default async function ServicePage({ params }: ServicePageParams) {
  const { service: serviceSlug } = await params;
  const service = getServiceBySlug(serviceSlug);

  if (!service || service.slug === "shrink-wrapping") {
    notFound();
  }

  const schema = serviceSchema(service);
  const heroContent = SERVICE_HERO_CONTENT[service.slug] || {
    eyebrow: service.name,
    headline: service.shortDescription,
    subline: service.longDescription,
  };
  const companionBenefits = COMPANION_SERVICE_BENEFITS[service.slug];
  const serviceBenefits = companionBenefits?.benefits ?? [];
  const serviceBenefitsHeadline = companionBenefits?.headline ?? "Premium dockside marine care";
  const heroImage = SERVICE_IMAGES[service.slug];
  const showTransformation = SHOW_TRANSFORMATION_SLUGS.includes(service.slug);
  const showTransformationImages = TRANSFORMATION_IMAGES_BY_SLUG[service.slug] ?? DEFAULT_BEFORE_AFTER_IMAGES;
  const showTransformationSlider = SHOW_TRANSFORMATION_SLIDER_SLUGS.includes(service.slug);
  const transformationSliderContent = TRANSFORMATION_SLIDER_CONTENT[service.slug];
  const visibleLocations = locations.slice(0, 4);
  const hiddenLocations = locations.slice(4);

  return (
    <>
      <SchemaScript schema={schema} />

      {/* HERO - Full-width cinematic */}
      <section className="relative isolate min-h-[88vh] overflow-hidden bg-[#03111c]">
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.22),transparent_32%),radial-gradient(circle_at_85%_18%,rgba(59,130,246,0.22),transparent_24%)]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#03111c]/95 via-[#03111c]/84 to-[#03111c]/68" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#03111c] via-[#03111c]/35 to-transparent" />
        </div>
        <div className="absolute left-[-6rem] top-24 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-[-5rem] right-[-3rem] h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />

        <div className="page-shell relative z-10 py-24 lg:py-32">
          <div className="grid items-end gap-12 lg:grid-cols-[minmax(0,1.15fr)_24rem]">
            <div className="max-w-3xl">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary/80 mb-4">
                {heroContent.eyebrow}
              </p>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.02] tracking-tight text-white">
                {heroContent.headline}
                <br />
                <span className="text-primary">Turn Heads</span> at the Dock.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/72 md:text-xl">
                {heroContent.subline}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <span className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm">
                  <Star className="w-4 h-4 text-primary" />
                  {getServiceStartingPriceLabel(service.slug)}
                </span>
                <span className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm">
                  <Clock className="w-4 h-4 text-primary" />
                  {service.duration}
                </span>
                <span className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm">
                  <MapPin className="w-4 h-4 text-primary" />
                  Fully mobile dockside service
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

            <div className="rounded-[2rem] border border-white/12 bg-white/10 p-7 text-white shadow-2xl shadow-black/35 backdrop-blur-xl lg:block">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <Award className="h-3.5 w-3.5" />
                What owners notice most
              </div>
              <h2 className="mt-5 text-2xl font-semibold leading-tight">{serviceBenefitsHeadline}</h2>
              <p className="mt-3 text-sm leading-6 text-white/65">
                A higher-end finish starts with the details. Every service page now highlights the outcome, the convenience, and the confidence behind the work.
              </p>
              <div className="mt-6 space-y-4">
                {serviceBenefits.slice(0, 3).map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                    <div className="mt-0.5 rounded-full bg-primary/15 p-2">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-sm leading-6 text-white/80">{benefit}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <p className="text-white/45">Starting from</p>
                  <p className="mt-1 font-semibold text-white">{getServiceStartingPriceLabel(service.slug)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                  <p className="text-white/45">Typical pace</p>
                  <p className="mt-1 font-semibold text-white">{service.duration}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="relative z-20 -mt-10 pb-14">
        <div className="page-shell">
          <div className="rounded-[2rem] border border-border/60 bg-background/90 p-6 shadow-2xl shadow-black/10 backdrop-blur-xl">
            <div className="grid gap-6 md:grid-cols-3 md:divide-x md:divide-border/60">
              <div className="flex items-center gap-4 px-2 md:px-6">
                <div className="rounded-2xl bg-primary/10 p-3">
                  <Star className="w-5 h-5 fill-primary text-primary" />
                </div>
                <div>
                  <p className="text-xl font-semibold text-foreground">5.0</p>
                  <p className="text-sm text-muted-foreground">average rating from local boat owners</p>
                </div>
              </div>
              <div className="flex items-center gap-4 px-2 md:px-6">
                <div className="rounded-2xl bg-primary/10 p-3">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-semibold text-foreground">500+</p>
                  <p className="text-sm text-muted-foreground">boats detailed across the region</p>
                </div>
              </div>
              <div className="flex items-center gap-4 px-2 md:px-6">
                <div className="rounded-2xl bg-primary/10 p-3">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-semibold text-foreground">Dockside service</p>
                  <p className="text-sm text-muted-foreground">we come to your marina, driveway, or storage yard</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VISUAL PROOF - Transformation section (only for relevant services) */}
      {showTransformation && (
        <section className="relative overflow-hidden bg-gradient-to-b from-[#03111c] via-[#082033] to-[#03111c] py-24">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.18),transparent_55%)]" />
          <div className="page-shell relative">
            <div className="mb-16 text-center">
              <p className="mb-3 text-sm font-medium uppercase tracking-[0.15em] text-primary/80">See the Difference</p>
              <h2 className="text-4xl font-bold text-white md:text-5xl">Real Results. Visible Transformation.</h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-white/60">
                From oxidized gelcoat to deep, mirror-like gloss. This is the difference professional detailing makes.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
              {showTransformationImages.map((img, i) => (
                <div
                  key={i}
                  className={`group relative ${i % 2 === 1 ? "md:mt-16" : ""}`}
                >
                  <div className="absolute -inset-2 rounded-[2rem] bg-gradient-to-br from-primary/20 via-transparent to-sky-500/15 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="relative aspect-[16/10] overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl shadow-black/30">
                    <Image
                      src={img.src}
                      alt={img.alt}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent" />
                  </div>
                  <div className={`absolute left-4 top-4 rounded-full px-4 py-1.5 text-sm font-semibold backdrop-blur-sm ${
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

      {showTransformationSlider && transformationSliderContent && (
        <section className="relative overflow-hidden bg-[linear-gradient(180deg,#020617_0%,#07111d_50%,#020617_100%)] py-20 md:py-28">
          <div className="absolute left-10 top-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 right-10 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="relative mb-10 px-4 text-center sm:px-6 lg:px-8">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">Interior Transformation</p>
            <h2 className="mt-4 text-4xl font-black text-white md:text-6xl">See the cabin come back to life.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/60 md:text-lg">
              Drag the slider to compare the seating area before and after professional interior detailing.
            </p>
          </div>

          <div className="page-shell relative rounded-[2rem] border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6">
            <TransformationSlider {...transformationSliderContent} />
          </div>
        </section>
      )}

      {/* SERVICE DESCRIPTION */}
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.08),transparent_28%),linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.18)_100%)] py-24">
        <div className="absolute right-0 top-10 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
        <div className="page-shell relative">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="rounded-[2rem] border border-border/60 bg-background/85 p-8 shadow-xl shadow-black/5 backdrop-blur-sm md:p-10">
              <p className="mb-3 text-sm font-medium uppercase tracking-[0.15em] text-primary/80">About This Service</p>
              <h2 className="text-3xl font-semibold text-foreground md:text-4xl">{service.name}</h2>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{service.longDescription}</p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/60 bg-card/70 p-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <Shield className="h-4 w-4" />
                    Investment clarity
                  </div>
                  <p className="mt-3 text-lg font-semibold text-foreground">{getServiceStartingPriceLabel(service.slug)}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Transparent pricing, clear scope, and no guesswork before the work begins.</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card/70 p-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <Clock className="h-4 w-4" />
                    Timing
                  </div>
                  <p className="mt-3 text-lg font-semibold text-foreground">{service.duration}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Built around practical dockside scheduling so the service feels easy from start to finish.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[#03111c] p-8 text-white shadow-2xl shadow-black/20 md:p-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                What&apos;s included
              </div>
              <h3 className="mt-5 text-2xl font-semibold">{serviceBenefitsHeadline}</h3>
              <p className="mt-3 text-sm leading-6 text-white/60">
                Every visit is designed to improve appearance, preserve materials, and make ownership feel simpler.
              </p>
              <div className="mt-6 space-y-4">
                {serviceBenefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                    <div className="rounded-full bg-primary/15 p-2">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-sm leading-6 text-white/80">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MID-PAGE CTA */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background via-background to-surface-ocean/20 py-24">
        <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.12),transparent_55%)]" />
        <div className="page-shell relative">
          <div className="grid gap-6 rounded-[2.25rem] border border-border/60 bg-card/70 p-8 shadow-2xl shadow-black/5 backdrop-blur-sm lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:p-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-5 py-2 text-sm font-medium text-primary">
                <Award className="w-4 h-4 text-primary" />
                Takes Less Than a Minute
              </div>
              <h2 className="mt-6 text-4xl font-bold tracking-tight text-foreground md:text-5xl">Get Your {service.name} Quote</h2>
              <p className="mt-4 max-w-xl text-lg text-muted-foreground">
                Tell us about your vessel. We&apos;ll prepare a transparent, detailed quote with no obligation and help you choose the right level of correction or protection.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
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
            <div className="rounded-[2rem] bg-[#03111c] p-6 text-white shadow-xl shadow-black/25 md:p-8">
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary/80">Why book now</p>
              <div className="mt-6 space-y-5">
                <div className="flex items-start gap-3">
                  <Clock className="mt-1 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Fast, clear scheduling</p>
                    <p className="mt-1 text-sm leading-6 text-white/60">Choose a date, request your service, and get a clear next step without the back-and-forth.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="mt-1 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Professional-grade process</p>
                    <p className="mt-1 text-sm leading-6 text-white/60">Every service is built around durable products, careful correction, and a finish that lasts longer.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-1 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Convenient dockside delivery</p>
                    <p className="mt-1 text-sm leading-6 text-white/60">We bring the detailing experience directly to your marina, lift, driveway, or storage location.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PREMIUM LOCATIONS */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.18)_100%)] py-24">
        <div className="absolute left-0 top-20 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="page-shell relative">
          <div className="mb-12 rounded-[2rem] border border-border/60 bg-background/80 p-8 shadow-xl shadow-black/5 backdrop-blur-sm">
            <div className="max-w-3xl">
              <p className="text-sm font-medium uppercase tracking-[0.15em] text-primary/80">Where we work</p>
              <h2 className="mt-3 text-3xl font-semibold text-foreground md:text-4xl">Service Area</h2>
              <p className="mt-4 text-lg text-muted-foreground">Premium dockside detailing across Ontario&apos;s finest waterways, with a service experience designed to feel premium before we even touch the boat.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {visibleLocations.map((location) => (
              <Link
                key={location.slug}
                href={`/${service.slug}/${location.slug}`}
                className="group rounded-[1.75rem] border border-border/60 bg-card/75 p-8 shadow-lg shadow-black/5 transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-transform duration-300 group-hover:scale-110">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <p className="text-lg font-semibold text-foreground">{location.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{location.region}</p>
                <div className="mt-6 flex items-center gap-2 text-sm font-medium text-primary">
                  Explore service availability <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
          {hiddenLocations.length > 0 && (
            <details className="group mt-8 rounded-[1.5rem] border border-border/60 bg-background/70 p-6 shadow-lg shadow-black/5 backdrop-blur-sm">
              <summary className="list-none flex cursor-pointer items-center justify-center gap-2 text-center text-sm text-muted-foreground transition-colors hover:text-primary">
                <span>View all {locations.length} service locations</span>
                <svg className="h-4 w-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {hiddenLocations.map((location) => (
                  <Link
                    key={location.slug}
                    href={`/${service.slug}/${location.slug}`}
                    className="rounded-full border border-border/50 bg-card/60 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-primary"
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
        <section className="relative overflow-hidden bg-surface-ocean py-24">
          <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-primary/10 blur-3xl" />
          <div className="page-shell relative">
            <div className="mb-16 text-center">
              <p className="text-sm font-medium uppercase tracking-[0.15em] text-primary/80">Enhance the finish</p>
              <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">Complete the Detail</h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-white/60">Popular add-ons to maximise your boat&apos;s protection and appearance while keeping the design flow rich and easy to scan.</p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {services
                .filter((item) => item.slug !== service.slug)
                .map((item) => {
                  const benefits = COMPANION_SERVICE_BENEFITS[item.slug];
                  return (
                    <Link
                      key={item.slug}
                      href={getServiceHref(item.slug)}
                      className="group rounded-[1.75rem] border border-white/10 bg-gradient-to-b from-card/90 to-card/55 p-8 backdrop-blur-sm transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10"
                    >
                      <div className="mb-5 flex items-start justify-between gap-4">
                        <h3 className="text-xl font-semibold text-foreground">{item.name}</h3>
                        <ArrowRight className="h-5 w-5 text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                      </div>
                      {benefits ? (
                        <>
                          <p className="mb-4 text-sm font-medium text-primary">{benefits.headline}</p>
                          <ul className="space-y-3">
                            {benefits.benefits.map((benefit, i) => (
                              <li key={i} className="flex items-start gap-3 text-sm text-white/70">
                                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <p className="text-sm text-white/60">{item.shortDescription}</p>
                      )}
                      <div className="mt-6 flex items-center gap-2 border-t border-white/10 pt-5 text-sm text-white/50">
                        <Shield className="h-4 w-4" />
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
      <section className="relative overflow-hidden bg-[#03111c] py-24 text-white">
        <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.16),transparent_55%)]" />
        <div className="page-shell relative">
          <div className="rounded-[2.5rem] border border-white/10 bg-white/5 px-8 py-12 text-center shadow-2xl shadow-black/25 backdrop-blur-sm md:px-12">
            <h2 className="text-4xl font-bold md:text-5xl">Ready to Transform Your Vessel?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/60">
              Secure your preferred service date before the season fills up. Your boat deserves a finish that looks premium in every light.
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
        </div>
      </section>
    </>
  );
}
