"use client";

/**
 * Design philosophy: Contemporary coastal modernism with concierge-style guidance.
 * File role: Native A1 Marine Care /quote experience that integrates the richer A1 Quote configurator into the site.
 * Visual rules: Asymmetrical layout, layered dark marine surfaces, refined typography, and calm step-by-step service discovery.
 */

import {
  Anchor,
  ArrowRight,
  Check,
  ChevronDown,
  Loader2,
  MapPin,
  Phone,
  ShipWheel,
  Sparkles,
  User,
  Waves,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { locations } from "@/content/site";
import {
  calculateBottomPainting,
  calculateCeramic,
  calculateExterior,
  calculateGelcoat,
  calculateGraphene,
  calculateInterior,
  calculateTotal,
  calculateVinyl,
  calculateWetSanding,
  type BottomPaintingConfig,
  type CeramicConfig,
  type ExteriorConfig,
  type GelcoatConfig,
  type GrapheneConfig,
  type InteriorConfig,
  type ServiceSelections,
  type VinylConfig,
  type WetSandingConfig,
} from "@/lib/quote-pricing";

type QuoteServiceKey =
  | "gelcoat"
  | "exterior"
  | "interior"
  | "ceramic"
  | "graphene"
  | "wetSanding"
  | "bottomPainting"
  | "vinyl";

type ContactState = {
  fullName: string;
  email: string;
  phone: string;
  notes: string;
};

type SubmissionState = "idle" | "submitting" | "success" | "error";

const HERO_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663121655920/cRD95DYdiDkLkVDTrTxai8/a1-quote-hero-harbor-dawn-XQuWxbEnpFvAuuFRzgPDvQ.webp";
const DETAIL_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663121655920/cRD95DYdiDkLkVDTrTxai8/a1-quote-form-ambient-detail-JRAkAdQRY847Gi69aomjRY.webp";
const TEXTURE_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663121655920/cRD95DYdiDkLkVDTrTxai8/a1-quote-texture-chart-AqEMQWMjqevELwgo9opxsJ.webp";

const BOAT_TYPES = [
  { value: "bowrider", label: "Open Bow / Bowrider" },
  { value: "cuddy", label: "Cuddy Cabin" },
  { value: "cruiser", label: "Cruiser (Single Cabin)" },
  { value: "express", label: "Express Cruiser" },
  { value: "yacht", label: "Yacht / Multi-Cabin" },
  { value: "sailboat", label: "Sailboat" },
  { value: "pontoon", label: "Pontoon" },
  { value: "other", label: "Other" },
] as const;

const EXTERIOR_TIERS = [
  {
    value: "refresh",
    label: "Refresh",
    description: "Maintenance clean for vessels already in strong seasonal condition.",
  },
  {
    value: "standard",
    label: "Standard",
    description: "Full wash, decontamination, hand polish, and protection.",
  },
  {
    value: "deep",
    label: "Deep Clean",
    description: "More aggressive correction for neglected or oxidized surfaces.",
  },
  {
    value: "restoration",
    label: "Restoration",
    description: "Heavy exterior revival for surfaces requiring significant correction.",
  },
] as const;

const INTERIOR_TIERS = [
  {
    value: "refresh",
    label: "Refresh",
    description: "Routine reset for cabins that need light cleaning and refinement.",
  },
  {
    value: "standard",
    label: "Standard",
    description: "A balanced interior service for vinyl, compartments, and upholstery.",
  },
  {
    value: "deep",
    label: "Deep Clean",
    description: "Higher-touch interior cleaning for build-up, staining, and marine use wear.",
  },
  {
    value: "restoration",
    label: "Restoration",
    description: "Manual-review interior restoration for complex cabin recovery work.",
  },
] as const;

const SERVICE_CATALOG: Array<{
  key: QuoteServiceKey;
  title: string;
  slug: string;
  summary: string;
  learnMore: string[];
}> = [
  {
    key: "gelcoat",
    title: "Gelcoat Restoration",
    slug: "gelcoat-restoration",
    summary: "Restore clarity, depth, and gloss on weathered fiberglass surfaces.",
    learnMore: [
      "Choose hull-only, topsides-only, bowrider, or full-boat coverage.",
      "Optional radar arch, hard top, heavy oxidation treatment, and spot wet sanding can be added.",
      "Pricing is calculated per foot with coverage-specific rates.",
    ],
  },
  {
    key: "exterior",
    title: "Exterior Detailing",
    slug: "boat-detailing",
    summary: "Multi-tier exterior detailing with optional teak, canvas, and accessory care.",
    learnMore: [
      "Four service tiers help match the quote to the vessel’s condition.",
      "Add-ons can include teak cleaning, canvas cleaning, fender cleaning, and exterior ozone treatment.",
      "This is the closest match to a full seasonal detailing package.",
    ],
  },
  {
    key: "interior",
    title: "Interior Detailing",
    slug: "interior-detailing",
    summary: "Cabin-focused detailing tailored to boat type, size, and condition.",
    learnMore: [
      "Interior pricing adjusts by vessel category and selected tier.",
      "Some larger or restoration-level interior projects are flagged for manual review.",
      "Add-ons cover mold remediation, galley, head, bedding, pet hair, and ozone treatment.",
    ],
  },
  {
    key: "ceramic",
    title: "Ceramic Coating",
    slug: "ceramic-coating",
    summary: "Marine ceramic protection with options for extra layers and specialty surfaces.",
    learnMore: [
      "Base ceramic pricing is calculated per foot.",
      "A second layer increases longevity and gloss depth.",
      "Optional teak and interior ceramic add-ons can be included.",
    ],
  },
  {
    key: "graphene",
    title: "Graphene Nano Coating",
    slug: "graphene-nano-coating",
    summary: "Premium graphene protection for clients seeking a harder-wearing finish.",
    learnMore: [
      "Graphene is quoted separately from ceramic at a higher per-foot rate.",
      "An additional layer and teak graphene treatment can be included.",
      "Often selected after correction or detailing services.",
    ],
  },
  {
    key: "wetSanding",
    title: "Wet Sanding & Correction",
    slug: "wet-sanding-correction",
    summary: "Precision correction for deeper scratches, oxidation, and surface defects.",
    learnMore: [
      "This service is priced per foot with optional deep scratch repair.",
      "Individual spot wet sanding areas can be added where needed.",
      "Ideal for vessels that need more than a polish-only solution.",
    ],
  },
  {
    key: "bottomPainting",
    title: "Bottom Painting",
    slug: "bottom-painting",
    summary: "Antifouling protection with optional prep and additional coating work.",
    learnMore: [
      "Pricing starts per foot and can increase for second coats and old paint removal.",
      "Heavy marine growth removal is available as an add-on.",
      "Blister repair requests are flagged for manual review.",
    ],
  },
  {
    key: "vinyl",
    title: "Vinyl Removal & Installation",
    slug: "vinyl-services",
    summary: "Graphics removal, installation, or full replacement for branded vessels.",
    learnMore: [
      "Select removal only, install only, or both.",
      "Custom design work can be added to the estimate.",
      "Pricing is based on vessel length and requested scope.",
    ],
  },
];

const LOCATION_BLURBS = [
  "Dockside service across Georgian Bay, Muskoka, Lake Simcoe, Midland, and Barrie.",
  "Live estimate logic from the original A1 quote application, now native to the main site.",
  "Use this page to scope services before reserving your preferred service window.",
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(value);
}

function ToggleChip({
  checked,
  label,
  onClick,
}: {
  checked: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-all ${
        checked
          ? "border-cyan-300/70 bg-cyan-300/12 text-cyan-50"
          : "border-white/12 bg-white/[0.03] text-slate-200 hover:border-cyan-200/40 hover:bg-white/[0.06]"
      }`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${checked ? "bg-cyan-300" : "bg-slate-500"}`}
      />
      {label}
    </button>
  );
}

function TierOption({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition-all ${
        active
          ? "border-cyan-300/70 bg-cyan-300/12 shadow-[0_0_0_1px_rgba(165,243,252,0.24)]"
          : "border-white/12 bg-white/[0.03] hover:border-cyan-200/35 hover:bg-white/[0.05]"
      }`}
    >
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">{description}</p>
    </button>
  );
}

function DetailSection({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker: string;
  children: ReactNode;
}) {
  return (
    <section className="surface-panel relative overflow-hidden border-white/10 bg-slate-950/75 p-6 md:p-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: `url(${TEXTURE_IMAGE})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-200/75">{kicker}</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">{title}</h2>
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}

export function QuoteFlow() {
  const [boatLength, setBoatLength] = useState<number>(0);
  const [boatType, setBoatType] = useState<string>("");
  const [locationSlug, setLocationSlug] = useState<string>(locations[0]?.slug ?? "");
  const [contact, setContact] = useState<ContactState>({
    fullName: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [submissionMessage, setSubmissionMessage] = useState<string>("");
  const [expandedService, setExpandedService] = useState<QuoteServiceKey | null>("gelcoat");

  const [selectedServices, setSelectedServices] = useState<Record<QuoteServiceKey, boolean>>({
    gelcoat: false,
    exterior: false,
    interior: false,
    ceramic: false,
    graphene: false,
    wetSanding: false,
    bottomPainting: false,
    vinyl: false,
  });

  const [gelcoatConfig, setGelcoatConfig] = useState<GelcoatConfig>({
    area: "hull",
    radarArch: false,
    hardTop: false,
    spotWetSanding: 0,
    heavyOxidation: false,
  });
  const [exteriorConfig, setExteriorConfig] = useState<ExteriorConfig>({
    tier: "refresh",
    teakCleaning: false,
    canvasCleaning: false,
    fenderCleaning: false,
    exteriorOzone: false,
  });
  const [interiorConfig, setInteriorConfig] = useState<InteriorConfig>({
    tier: "refresh",
    moldRemediation: false,
    mattressShampoo: false,
    headDeepClean: false,
    galleyDeepClean: false,
    petHairRemoval: false,
    ozoneInterior: false,
  });
  const [ceramicConfig, setCeramicConfig] = useState<CeramicConfig>({
    secondLayer: false,
    teakCeramic: false,
    interiorCeramic: false,
  });
  const [grapheneConfig, setGrapheneConfig] = useState<GrapheneConfig>({
    secondLayer: false,
    teakGraphene: false,
  });
  const [wetSandingConfig, setWetSandingConfig] = useState<WetSandingConfig>({
    deepScratchRepair: false,
    spotWetSanding: 0,
  });
  const [bottomPaintingConfig, setBottomPaintingConfig] = useState<BottomPaintingConfig>({
    secondCoat: false,
    oldPaintRemoval: false,
    heavyGrowthRemoval: false,
    blisterRepair: false,
  });
  const [vinylConfig, setVinylConfig] = useState<VinylConfig>({
    service: "removal",
    customDesign: false,
  });

  const serviceSelections = useMemo<ServiceSelections>(() => {
    const nextSelections: ServiceSelections = {};

    if (selectedServices.gelcoat) nextSelections.gelcoat = gelcoatConfig;
    if (selectedServices.exterior) nextSelections.exterior = exteriorConfig;
    if (selectedServices.interior) nextSelections.interior = interiorConfig;
    if (selectedServices.ceramic) nextSelections.ceramic = ceramicConfig;
    if (selectedServices.graphene) nextSelections.graphene = grapheneConfig;
    if (selectedServices.wetSanding) nextSelections.wetSanding = wetSandingConfig;
    if (selectedServices.bottomPainting) nextSelections.bottomPainting = bottomPaintingConfig;
    if (selectedServices.vinyl) nextSelections.vinyl = vinylConfig;

    return nextSelections;
  }, [
    bottomPaintingConfig,
    ceramicConfig,
    exteriorConfig,
    gelcoatConfig,
    grapheneConfig,
    interiorConfig,
    selectedServices,
    vinylConfig,
    wetSandingConfig,
  ]);

  const estimate = useMemo(() => {
    if (!boatLength || !boatType) return null;
    return calculateTotal(boatLength, boatType, serviceSelections);
  }, [boatLength, boatType, serviceSelections]);

  const lineItems = useMemo(() => {
    if (!boatLength) return [] as Array<{ label: string; amount: number }>;

    const items: Array<{ label: string; amount: number }> = [];

    if (selectedServices.gelcoat) items.push({ label: "Gelcoat Restoration", amount: calculateGelcoat(boatLength, gelcoatConfig).subtotal });
    if (selectedServices.exterior) items.push({ label: "Exterior Detailing", amount: calculateExterior(boatLength, exteriorConfig).subtotal });
    if (selectedServices.interior) items.push({ label: "Interior Detailing", amount: calculateInterior(boatLength, boatType, interiorConfig).subtotal });
    if (selectedServices.ceramic) items.push({ label: "Ceramic Coating", amount: calculateCeramic(boatLength, ceramicConfig).subtotal });
    if (selectedServices.graphene) items.push({ label: "Graphene Nano Coating", amount: calculateGraphene(boatLength, grapheneConfig).subtotal });
    if (selectedServices.wetSanding) items.push({ label: "Wet Sanding & Correction", amount: calculateWetSanding(boatLength, wetSandingConfig).subtotal });
    if (selectedServices.bottomPainting) items.push({ label: "Bottom Painting", amount: calculateBottomPainting(boatLength, bottomPaintingConfig).subtotal });
    if (selectedServices.vinyl) items.push({ label: "Vinyl Services", amount: calculateVinyl(boatLength, vinylConfig).subtotal });

    return items;
  }, [
    boatLength,
    boatType,
    bottomPaintingConfig,
    ceramicConfig,
    exteriorConfig,
    gelcoatConfig,
    grapheneConfig,
    interiorConfig,
    selectedServices,
    vinylConfig,
    wetSandingConfig,
  ]);

  const activeServices = useMemo(
    () => SERVICE_CATALOG.filter((service) => selectedServices[service.key]),
    [selectedServices],
  );

  const addonSummary = useMemo(() => {
    const summary: string[] = [];

    if (selectedServices.gelcoat) {
      summary.push(`Gelcoat area: ${gelcoatConfig.area}`);
      if (gelcoatConfig.radarArch) summary.push("Gelcoat add-on: radar arch");
      if (gelcoatConfig.hardTop) summary.push("Gelcoat add-on: hard top");
      if (gelcoatConfig.heavyOxidation) summary.push("Gelcoat add-on: heavy oxidation");
      if (gelcoatConfig.spotWetSanding > 0) summary.push(`Gelcoat spot wet sanding areas: ${gelcoatConfig.spotWetSanding}`);
    }

    if (selectedServices.exterior) {
      summary.push(`Exterior tier: ${exteriorConfig.tier}`);
      if (exteriorConfig.teakCleaning) summary.push("Exterior add-on: teak cleaning");
      if (exteriorConfig.canvasCleaning) summary.push("Exterior add-on: canvas cleaning");
      if (exteriorConfig.fenderCleaning) summary.push("Exterior add-on: fender cleaning");
      if (exteriorConfig.exteriorOzone) summary.push("Exterior add-on: ozone treatment");
    }

    if (selectedServices.interior) {
      summary.push(`Interior tier: ${interiorConfig.tier}`);
      if (interiorConfig.moldRemediation) summary.push("Interior add-on: mold remediation");
      if (interiorConfig.mattressShampoo) summary.push("Interior add-on: mattress shampoo");
      if (interiorConfig.headDeepClean) summary.push("Interior add-on: head deep clean");
      if (interiorConfig.galleyDeepClean) summary.push("Interior add-on: galley deep clean");
      if (interiorConfig.petHairRemoval) summary.push("Interior add-on: pet hair removal");
      if (interiorConfig.ozoneInterior) summary.push("Interior add-on: ozone treatment");
    }

    if (selectedServices.ceramic) {
      if (ceramicConfig.secondLayer) summary.push("Ceramic add-on: second layer");
      if (ceramicConfig.teakCeramic) summary.push("Ceramic add-on: teak protection");
      if (ceramicConfig.interiorCeramic) summary.push("Ceramic add-on: interior protection");
    }

    if (selectedServices.graphene) {
      if (grapheneConfig.secondLayer) summary.push("Graphene add-on: second layer");
      if (grapheneConfig.teakGraphene) summary.push("Graphene add-on: teak protection");
    }

    if (selectedServices.wetSanding) {
      if (wetSandingConfig.deepScratchRepair) summary.push("Wet sanding add-on: deep scratch repair");
      if (wetSandingConfig.spotWetSanding > 0) summary.push(`Wet sanding spot areas: ${wetSandingConfig.spotWetSanding}`);
    }

    if (selectedServices.bottomPainting) {
      if (bottomPaintingConfig.secondCoat) summary.push("Bottom painting add-on: second coat");
      if (bottomPaintingConfig.oldPaintRemoval) summary.push("Bottom painting add-on: old paint removal");
      if (bottomPaintingConfig.heavyGrowthRemoval) summary.push("Bottom painting add-on: heavy growth removal");
      if (bottomPaintingConfig.blisterRepair) summary.push("Bottom painting note: blister repair requested");
    }

    if (selectedServices.vinyl) {
      summary.push(`Vinyl scope: ${vinylConfig.service}`);
      if (vinylConfig.customDesign) summary.push("Vinyl add-on: custom design");
    }

    return summary;
  }, [
    bottomPaintingConfig,
    ceramicConfig,
    exteriorConfig,
    gelcoatConfig,
    grapheneConfig,
    interiorConfig,
    selectedServices,
    vinylConfig,
    wetSandingConfig,
  ]);

  const canSubmit =
    boatLength > 0 &&
    boatType.length > 0 &&
    locationSlug.length > 0 &&
    activeServices.length > 0 &&
    contact.fullName.trim().length > 1 &&
    contact.email.trim().length > 3 &&
    contact.phone.trim().length > 6;

  const selectedBoatTypeLabel = BOAT_TYPES.find((type) => type.value === boatType)?.label ?? boatType;
  const selectedLocation = locations.find((location) => location.slug === locationSlug);

  const requestSummary = useMemo(() => {
    const sections = [
      `Estimator summary`,
      `Boat length: ${boatLength || "Not provided"} ft`,
      `Boat type: ${selectedBoatTypeLabel || "Not provided"}`,
      `Location: ${selectedLocation?.name ?? locationSlug}`,
      `Selected services: ${activeServices.map((service) => service.title).join(", ") || "None"}`,
      `Options: ${addonSummary.join("; ") || "None"}`,
      `Estimated subtotal: ${estimate ? formatCurrency(estimate.subtotal) : "Not available"}`,
      estimate?.requiresManualReview
        ? `Manual review reasons: ${estimate.reviewReasons.join("; ")}`
        : `Manual review reasons: none`,
    ];

    return sections.join("\n");
  }, [activeServices, addonSummary, boatLength, estimate, locationSlug, selectedBoatTypeLabel, selectedLocation?.name]);

  async function handleSubmit() {
    if (!canSubmit) return;

    setSubmissionState("submitting");
    setSubmissionMessage("");

    const notesPayload = [contact.notes.trim(), requestSummary, estimate?.breakdown?.length ? `Breakdown: ${estimate.breakdown.join(" | ")}` : ""]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 4900);

    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boatLength: String(boatLength),
          boatType: selectedBoatTypeLabel,
          services: activeServices.map((service) => service.slug),
          addons: addonSummary,
          contactName: contact.fullName.trim(),
          contactEmail: contact.email.trim(),
          contactPhone: contact.phone.trim(),
          notes: notesPayload,
          locationSlug,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to create quote request.");
      }

      const payload = await response.json();
      setSubmissionState("success");
      setSubmissionMessage(
        `Your quote request has been submitted${payload?.id ? ` with reference ${payload.id}` : ""}. You can continue to booking when ready.`,
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setSubmissionState("error");
      setSubmissionMessage(error instanceof Error ? error.message : "Unable to create quote request.");
    }
  }

  function toggleService(key: QuoteServiceKey) {
    setSelectedServices((previous) => {
      const nextState = !previous[key];
      if (nextState) setExpandedService(key);
      return { ...previous, [key]: nextState };
    });
  }

  return (
    <section className="relative overflow-hidden bg-[hsl(216,34%,6%)] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(148,163,184,0.12),transparent_30%)]" />

      <div className="relative border-b border-white/10">
        <div className="page-shell py-10 md:py-14">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-stretch">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-[0_24px_90px_-36px_rgba(0,0,0,0.9)] md:p-10">
              <div
                className="absolute inset-0 opacity-45"
                style={{
                  backgroundImage: `linear-gradient(140deg, rgba(2,6,23,0.88), rgba(8,47,73,0.45)), url(${HERO_IMAGE})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <div className="relative max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200/90">A1 Service. A1 Results.</p>
                <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white md:text-6xl">
                  Configure Your Service Package.
                </h1>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-200 md:text-lg">
                  Premium boat care with transparent pricing. Customize your services and get an instant estimate without leaving
                  <span className="font-medium text-cyan-100"> a1marinecare.ca</span>.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <a href="#quote-builder">
                    <Button variant="hero" size="lg">
                      Start your quote
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </a>
                  <a href="/booking">
                    <Button variant="heroOutline" size="lg">
                      Reserve a service date
                    </Button>
                  </a>
                </div>
                <div className="mt-10 grid gap-3 text-sm text-slate-100/90 sm:grid-cols-3">
                  {LOCATION_BLURBS.map((item) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 backdrop-blur-sm">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="surface-panel border-white/10 bg-slate-950/75 p-5">
                <div className="flex items-center gap-3 text-cyan-200">
                  <ShipWheel className="h-5 w-5" />
                  <p className="text-sm font-semibold uppercase tracking-[0.22em]">Vessel profile</p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  Start with your boat size, vessel type, and preferred service area so the estimator uses the right base logic.
                </p>
              </div>
              <div className="surface-panel border-white/10 bg-slate-950/75 p-5">
                <div className="flex items-center gap-3 text-cyan-200">
                  <Sparkles className="h-5 w-5" />
                  <p className="text-sm font-semibold uppercase tracking-[0.22em]">Service scope</p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  Layer detailing, coatings, correction, and specialty work into one coordinated estimate.
                </p>
              </div>
              <div className="surface-panel border-white/10 bg-slate-950/75 p-5">
                <div className="flex items-center gap-3 text-cyan-200">
                  <Anchor className="h-5 w-5" />
                  <p className="text-sm font-semibold uppercase tracking-[0.22em]">Next step</p>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  Submit your request and move directly into a booking conversation when the scope looks right.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="quote-builder" className="page-shell relative py-14 md:py-20">
        {submissionState === "success" ? (
          <div className="mb-8 rounded-[1.5rem] border border-emerald-400/30 bg-emerald-400/10 px-5 py-4 text-emerald-50">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Quote request received.</p>
                  <p className="text-sm text-emerald-50/85">{submissionMessage}</p>
                </div>
              </div>
              <a href="/booking">
                <Button variant="secondary">Continue to booking</Button>
              </a>
            </div>
          </div>
        ) : null}

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.5fr)_420px] xl:items-start">
          <div className="space-y-6">
            <DetailSection title="Tell us about your boat" kicker="Step 1 · Vessel intake">
              <div className="grid gap-5 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="boat-length" className="text-slate-100">
                    Boat length (ft)
                  </Label>
                  <Input
                    id="boat-length"
                    type="number"
                    min={1}
                    value={boatLength || ""}
                    onChange={(event) => setBoatLength(Number(event.target.value))}
                    placeholder="e.g. 32"
                    className="border-white/10 bg-white/[0.04] text-white placeholder:text-slate-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-100">Boat type</Label>
                  <Select value={boatType} onValueChange={setBoatType}>
                    <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                      <SelectValue placeholder="Select vessel type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BOAT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-100">Service area</Label>
                  <Select value={locationSlug} onValueChange={setLocationSlug}>
                    <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                      <SelectValue placeholder="Choose location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.slug} value={location.slug}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">Selected type</p>
                  <p className="mt-2 text-sm text-slate-200">{selectedBoatTypeLabel || "Awaiting vessel type"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">Operating region</p>
                  <p className="mt-2 text-sm text-slate-200">{selectedLocation?.name ?? "Awaiting location"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">Estimate mode</p>
                  <p className="mt-2 text-sm text-slate-200">Live configurator with manual-review flags for complex scopes</p>
                </div>
              </div>
            </DetailSection>

            <DetailSection title="Build your service scope" kicker="Step 2 · Premium service selection">
              <div className="space-y-4">
                {SERVICE_CATALOG.map((service) => {
                  const isSelected = selectedServices[service.key];
                  const isExpanded = expandedService === service.key;

                  return (
                    <div
                      key={service.key}
                      className={`overflow-hidden rounded-[1.6rem] border transition-all ${
                        isSelected
                          ? "border-cyan-300/35 bg-cyan-400/[0.06] shadow-[0_14px_50px_-30px_rgba(34,211,238,0.45)]"
                          : "border-white/10 bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between md:p-6">
                        <div className="max-w-2xl">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-xl font-semibold text-white">{service.title}</h3>
                            {isSelected ? (
                              <span className="rounded-full border border-cyan-300/40 bg-cyan-300/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
                                Included
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm leading-relaxed text-slate-300">{service.summary}</p>
                          <button
                            type="button"
                            onClick={() => setExpandedService(isExpanded ? null : service.key)}
                            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-cyan-200 transition-colors hover:text-cyan-100"
                          >
                            {isExpanded ? "Hide service notes" : "View service notes"}
                            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </button>
                        </div>
                        <Button
                          variant={isSelected ? "secondary" : "heroOutline"}
                          onClick={() => toggleService(service.key)}
                          className="min-w-[156px]"
                        >
                          {isSelected ? "Remove service" : "Add service"}
                        </Button>
                      </div>

                      {isExpanded ? (
                        <div className="border-t border-white/10 px-5 pb-5 pt-0 md:px-6 md:pb-6">
                          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-slate-300">
                            {service.learnMore.map((item) => (
                              <li key={item} className="flex gap-3">
                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {isSelected ? (
                        <div className="border-t border-white/10 px-5 py-5 md:px-6 md:py-6">
                          {service.key === "gelcoat" ? (
                            <div className="space-y-5">
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                  <Label className="text-slate-100">Coverage area</Label>
                                  <Select
                                    value={gelcoatConfig.area}
                                    onValueChange={(value) => setGelcoatConfig((current) => ({ ...current, area: value as GelcoatConfig["area"] }))}
                                  >
                                    <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                                      <SelectValue placeholder="Choose coverage" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="hull">Hull only</SelectItem>
                                      <SelectItem value="topsides">Topsides only</SelectItem>
                                      <SelectItem value="bowrider">Bowrider special</SelectItem>
                                      <SelectItem value="fullboat">Full boat</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="gelcoat-areas" className="text-slate-100">
                                    Spot wet sanding areas
                                  </Label>
                                  <Input
                                    id="gelcoat-areas"
                                    type="number"
                                    min={0}
                                    value={gelcoatConfig.spotWetSanding}
                                    onChange={(event) =>
                                      setGelcoatConfig((current) => ({
                                        ...current,
                                        spotWetSanding: Math.max(0, Number(event.target.value)),
                                      }))
                                    }
                                    className="border-white/10 bg-white/[0.04] text-white"
                                  />
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <ToggleChip
                                  checked={gelcoatConfig.radarArch}
                                  label="Radar arch"
                                  onClick={() => setGelcoatConfig((current) => ({ ...current, radarArch: !current.radarArch }))}
                                />
                                <ToggleChip
                                  checked={gelcoatConfig.hardTop}
                                  label="Hard top"
                                  onClick={() => setGelcoatConfig((current) => ({ ...current, hardTop: !current.hardTop }))}
                                />
                                <ToggleChip
                                  checked={gelcoatConfig.heavyOxidation}
                                  label="Heavy oxidation"
                                  onClick={() =>
                                    setGelcoatConfig((current) => ({ ...current, heavyOxidation: !current.heavyOxidation }))
                                  }
                                />
                              </div>
                            </div>
                          ) : null}

                          {service.key === "exterior" ? (
                            <div className="space-y-5">
                              <div className="grid gap-3 md:grid-cols-2">
                                {EXTERIOR_TIERS.map((tier) => (
                                  <TierOption
                                    key={tier.value}
                                    active={exteriorConfig.tier === tier.value}
                                    title={tier.label}
                                    description={tier.description}
                                    onClick={() => setExteriorConfig((current) => ({ ...current, tier: tier.value }))}
                                  />
                                ))}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <ToggleChip
                                  checked={exteriorConfig.teakCleaning}
                                  label="Teak cleaning"
                                  onClick={() => setExteriorConfig((current) => ({ ...current, teakCleaning: !current.teakCleaning }))}
                                />
                                <ToggleChip
                                  checked={exteriorConfig.canvasCleaning}
                                  label="Canvas cleaning"
                                  onClick={() => setExteriorConfig((current) => ({ ...current, canvasCleaning: !current.canvasCleaning }))}
                                />
                                <ToggleChip
                                  checked={exteriorConfig.fenderCleaning}
                                  label="Fender cleaning"
                                  onClick={() => setExteriorConfig((current) => ({ ...current, fenderCleaning: !current.fenderCleaning }))}
                                />
                                <ToggleChip
                                  checked={exteriorConfig.exteriorOzone}
                                  label="Exterior ozone"
                                  onClick={() => setExteriorConfig((current) => ({ ...current, exteriorOzone: !current.exteriorOzone }))}
                                />
                              </div>
                            </div>
                          ) : null}

                          {service.key === "interior" ? (
                            <div className="space-y-5">
                              <div className="grid gap-3 md:grid-cols-2">
                                {INTERIOR_TIERS.map((tier) => (
                                  <TierOption
                                    key={tier.value}
                                    active={interiorConfig.tier === tier.value}
                                    title={tier.label}
                                    description={tier.description}
                                    onClick={() => setInteriorConfig((current) => ({ ...current, tier: tier.value }))}
                                  />
                                ))}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <ToggleChip
                                  checked={interiorConfig.moldRemediation}
                                  label="Mold remediation"
                                  onClick={() => setInteriorConfig((current) => ({ ...current, moldRemediation: !current.moldRemediation }))}
                                />
                                <ToggleChip
                                  checked={interiorConfig.mattressShampoo}
                                  label="Mattress shampoo"
                                  onClick={() => setInteriorConfig((current) => ({ ...current, mattressShampoo: !current.mattressShampoo }))}
                                />
                                <ToggleChip
                                  checked={interiorConfig.headDeepClean}
                                  label="Head deep clean"
                                  onClick={() => setInteriorConfig((current) => ({ ...current, headDeepClean: !current.headDeepClean }))}
                                />
                                <ToggleChip
                                  checked={interiorConfig.galleyDeepClean}
                                  label="Galley deep clean"
                                  onClick={() => setInteriorConfig((current) => ({ ...current, galleyDeepClean: !current.galleyDeepClean }))}
                                />
                                <ToggleChip
                                  checked={interiorConfig.petHairRemoval}
                                  label="Pet hair removal"
                                  onClick={() => setInteriorConfig((current) => ({ ...current, petHairRemoval: !current.petHairRemoval }))}
                                />
                                <ToggleChip
                                  checked={interiorConfig.ozoneInterior}
                                  label="Ozone treatment"
                                  onClick={() => setInteriorConfig((current) => ({ ...current, ozoneInterior: !current.ozoneInterior }))}
                                />
                              </div>
                            </div>
                          ) : null}

                          {service.key === "ceramic" ? (
                            <div className="flex flex-wrap gap-2">
                              <ToggleChip
                                checked={ceramicConfig.secondLayer}
                                label="Second layer"
                                onClick={() => setCeramicConfig((current) => ({ ...current, secondLayer: !current.secondLayer }))}
                              />
                              <ToggleChip
                                checked={ceramicConfig.teakCeramic}
                                label="Teak ceramic"
                                onClick={() => setCeramicConfig((current) => ({ ...current, teakCeramic: !current.teakCeramic }))}
                              />
                              <ToggleChip
                                checked={ceramicConfig.interiorCeramic}
                                label="Interior ceramic"
                                onClick={() =>
                                  setCeramicConfig((current) => ({ ...current, interiorCeramic: !current.interiorCeramic }))
                                }
                              />
                            </div>
                          ) : null}

                          {service.key === "graphene" ? (
                            <div className="flex flex-wrap gap-2">
                              <ToggleChip
                                checked={grapheneConfig.secondLayer}
                                label="Second layer"
                                onClick={() => setGrapheneConfig((current) => ({ ...current, secondLayer: !current.secondLayer }))}
                              />
                              <ToggleChip
                                checked={grapheneConfig.teakGraphene}
                                label="Teak graphene"
                                onClick={() => setGrapheneConfig((current) => ({ ...current, teakGraphene: !current.teakGraphene }))}
                              />
                            </div>
                          ) : null}

                          {service.key === "wetSanding" ? (
                            <div className="space-y-5">
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                  <Label htmlFor="wet-sanding-areas" className="text-slate-100">
                                    Spot sanding areas
                                  </Label>
                                  <Input
                                    id="wet-sanding-areas"
                                    type="number"
                                    min={0}
                                    value={wetSandingConfig.spotWetSanding}
                                    onChange={(event) =>
                                      setWetSandingConfig((current) => ({
                                        ...current,
                                        spotWetSanding: Math.max(0, Number(event.target.value)),
                                      }))
                                    }
                                    className="border-white/10 bg-white/[0.04] text-white"
                                  />
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <ToggleChip
                                  checked={wetSandingConfig.deepScratchRepair}
                                  label="Deep scratch repair"
                                  onClick={() =>
                                    setWetSandingConfig((current) => ({
                                      ...current,
                                      deepScratchRepair: !current.deepScratchRepair,
                                    }))
                                  }
                                />
                              </div>
                            </div>
                          ) : null}

                          {service.key === "bottomPainting" ? (
                            <div className="flex flex-wrap gap-2">
                              <ToggleChip
                                checked={bottomPaintingConfig.secondCoat}
                                label="Second coat"
                                onClick={() =>
                                  setBottomPaintingConfig((current) => ({ ...current, secondCoat: !current.secondCoat }))
                                }
                              />
                              <ToggleChip
                                checked={bottomPaintingConfig.oldPaintRemoval}
                                label="Old paint removal"
                                onClick={() =>
                                  setBottomPaintingConfig((current) => ({
                                    ...current,
                                    oldPaintRemoval: !current.oldPaintRemoval,
                                  }))
                                }
                              />
                              <ToggleChip
                                checked={bottomPaintingConfig.heavyGrowthRemoval}
                                label="Heavy growth removal"
                                onClick={() =>
                                  setBottomPaintingConfig((current) => ({
                                    ...current,
                                    heavyGrowthRemoval: !current.heavyGrowthRemoval,
                                  }))
                                }
                              />
                              <ToggleChip
                                checked={bottomPaintingConfig.blisterRepair}
                                label="Blister repair"
                                onClick={() =>
                                  setBottomPaintingConfig((current) => ({
                                    ...current,
                                    blisterRepair: !current.blisterRepair,
                                  }))
                                }
                              />
                            </div>
                          ) : null}

                          {service.key === "vinyl" ? (
                            <div className="space-y-5">
                              <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                  <Label className="text-slate-100">Vinyl scope</Label>
                                  <Select
                                    value={vinylConfig.service}
                                    onValueChange={(value) =>
                                      setVinylConfig((current) => ({ ...current, service: value as VinylConfig["service"] }))
                                    }
                                  >
                                    <SelectTrigger className="border-white/10 bg-white/[0.04] text-white">
                                      <SelectValue placeholder="Choose scope" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="removal">Removal only</SelectItem>
                                      <SelectItem value="install">Install only</SelectItem>
                                      <SelectItem value="both">Removal + install</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <ToggleChip
                                  checked={vinylConfig.customDesign}
                                  label="Custom design"
                                  onClick={() => setVinylConfig((current) => ({ ...current, customDesign: !current.customDesign }))}
                                />
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </DetailSection>

            <DetailSection title="Contact and request notes" kicker="Step 3 · Confirm your request">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact-name" className="text-slate-100">
                    Full name
                  </Label>
                  <Input
                    id="contact-name"
                    value={contact.fullName}
                    onChange={(event) => setContact((current) => ({ ...current, fullName: event.target.value }))}
                    className="border-white/10 bg-white/[0.04] text-white placeholder:text-slate-400"
                    placeholder="Your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-phone" className="text-slate-100">
                    Phone number
                  </Label>
                  <Input
                    id="contact-phone"
                    value={contact.phone}
                    onChange={(event) => setContact((current) => ({ ...current, phone: event.target.value }))}
                    className="border-white/10 bg-white/[0.04] text-white placeholder:text-slate-400"
                    placeholder="Best number to reach you"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="contact-email" className="text-slate-100">
                    Email address
                  </Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={contact.email}
                    onChange={(event) => setContact((current) => ({ ...current, email: event.target.value }))}
                    className="border-white/10 bg-white/[0.04] text-white placeholder:text-slate-400"
                    placeholder="Where should we send your quote follow-up?"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="quote-notes" className="text-slate-100">
                    Condition notes
                  </Label>
                  <Textarea
                    id="quote-notes"
                    value={contact.notes}
                    onChange={(event) => setContact((current) => ({ ...current, notes: event.target.value }))}
                    className="min-h-32 border-white/10 bg-white/[0.04] text-white placeholder:text-slate-400"
                    placeholder="Tell us about oxidation, stains, mooring conditions, storage, timeline, or anything else that will help us review the request."
                  />
                </div>
              </div>

              {submissionState === "error" ? (
                <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                  {submissionMessage || "Unable to create quote request. Please review the form and try again."}
                </div>
              ) : null}
            </DetailSection>
          </div>

          <aside className="xl:sticky xl:top-24">
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/85 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.9)] backdrop-blur-sm">
              <div
                className="relative h-48 border-b border-white/10"
                style={{
                  backgroundImage: `linear-gradient(160deg, rgba(2,6,23,0.35), rgba(2,6,23,0.75)), url(${DETAIL_IMAGE})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/85">Live estimate</p>
                  <h3 className="mt-2 text-3xl font-semibold text-white">
                    {estimate ? formatCurrency(estimate.subtotal) : "$0"}
                  </h3>
                  <p className="mt-2 text-sm text-slate-200/90">Updated as you configure services and add-ons.</p>
                </div>
              </div>

              <div className="space-y-6 p-6">
                <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2 text-cyan-200">
                      <Waves className="h-4 w-4" />
                      <p className="text-xs font-semibold uppercase tracking-[0.18em]">Length</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-200">{boatLength ? `${boatLength} ft` : "Awaiting input"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2 text-cyan-200">
                      <MapPin className="h-4 w-4" />
                      <p className="text-xs font-semibold uppercase tracking-[0.18em]">Location</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-200">{selectedLocation?.name ?? "Awaiting input"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2 text-cyan-200">
                      <User className="h-4 w-4" />
                      <p className="text-xs font-semibold uppercase tracking-[0.18em]">Contact</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-200">{contact.fullName || "Awaiting input"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/80">Included services</p>
                  <div className="mt-4 space-y-3">
                    {lineItems.length > 0 ? (
                      lineItems.map((item) => (
                        <div key={item.label} className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-white">{item.label}</p>
                            <p className="text-xs text-slate-400">Native A1 quote logic applied</p>
                          </div>
                          <p className="text-sm font-semibold text-cyan-100">{item.amount > 0 ? formatCurrency(item.amount) : "Manual review"}</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/12 px-4 py-5 text-sm text-slate-400">
                        Add one or more services to see the estimate come together.
                      </div>
                    )}
                  </div>
                </div>

                {estimate?.requiresManualReview ? (
                  <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-4 text-sm text-amber-50">
                    <p className="font-semibold">Manual review required</p>
                    <ul className="mt-2 space-y-1 text-amber-50/85">
                      {estimate.reviewReasons.map((reason) => (
                        <li key={reason}>• {reason}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {estimate?.breakdown?.length ? (
                  <details className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <summary className="cursor-pointer list-none text-sm font-medium text-white">
                      View detailed pricing breakdown
                    </summary>
                    <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm text-slate-300">
                      {estimate.breakdown.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </details>
                ) : null}

                <div className="rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.95),rgba(8,47,73,0.55))] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/80">What happens next</p>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">
                    Submit the quote here, then continue to booking when you are ready to reserve a preferred service date.
                    A1 Marine Care can confirm any manual-review items during follow-up.
                  </p>
                </div>

                <Button
                  variant="hero"
                  size="lg"
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={!canSubmit || submissionState === "submitting"}
                >
                  {submissionState === "submitting" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting quote request
                    </>
                  ) : (
                    <>
                      Submit quote request
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                    <p>
                      Prefer to speak first? Submit the request here, then use the booking page or your normal A1 follow-up process to finalize timing.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
