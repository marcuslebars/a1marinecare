"use client";

import { useState, useMemo } from "react";

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
import { locations } from "@/content/site";
import {
  calculateBiweeklyMaintenance,
  calculateBottomPainting,
  calculateCeramic,
  calculateExterior,
  calculateGelcoat,
  calculateGraphene,
  calculateInterior,
  calculateTotal,
  calculateVinyl,
  calculateWeeklyMaintenance,
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
import { Anchor, ArrowLeft, ArrowRight, Loader2, Mail, MapPin, Phone, Ruler, Ship, User, Waves } from "lucide-react";

import ProgressBar from "@/components/quote/ProgressBar";
import ServiceCard, { type ServiceKey } from "@/components/quote/ServiceCard";
import TierSelector from "@/components/quote/TierSelector";
import OptionToggle from "@/components/quote/OptionToggle";
import StickyPricePanel from "@/components/quote/StickyPricePanel";
import AnimatedPrice from "@/components/quote/AnimatedPrice";
import LearnMoreModal from "@/components/quote/LearnMoreModal";
import { LocationCombobox } from "@/components/quote/LocationCombobox";

const EXTERIOR_TIERS = [
  { value: "refresh", label: "Refresh", multiplier: "1.0x", description: "Quick maintenance clean for well-kept boats" },
  { value: "standard", label: "Standard", multiplier: "1.2x", description: "Full wash, clay bar, and hand polish with sealant" },
  { value: "deep", label: "Deep Clean", multiplier: "1.4x", description: "Heavy decontamination and multi-stage polish" },
  { value: "restoration", label: "Restoration", multiplier: "1.6x", description: "Complete exterior revival for neglected surfaces" },
];

const INTERIOR_TIERS = [
  { value: "refresh", label: "Refresh", multiplier: "1.0x", description: "Light vacuum, wipe-down, and surface sanitisation" },
  { value: "standard", label: "Standard", multiplier: "1.25x", description: "Full vacuum, upholstery cleaning, and treatment" },
  { value: "deep", label: "Deep Clean", multiplier: "1.5x", description: "Intensive deep cleaning of all surfaces and fabrics" },
  { value: "restoration", label: "Restoration", multiplier: "1.75x", description: "Complete interior restoration for heavy soiling" },
];

const SERVICE_META: Record<ServiceKey, { title: string; description: string }> = {
  gelcoat: { title: "Gelcoat Restoration", description: "Restore gloss and remove oxidation from fiberglass surfaces." },
  exterior: { title: "Exterior Detailing", description: "Professional exterior cleaning, polishing, and protection." },
  interior: { title: "Interior Detailing", description: "Thorough interior cleaning tailored to your boat and condition." },
  ceramic: { title: "Ceramic Coating", description: "Long-lasting hydrophobic barrier against UV, salt, and contaminants." },
  graphene: { title: "Graphene Nano Coating", description: "Next-gen graphene coating with superior hardness and heat resistance." },
  wetSanding: { title: "Wet Sanding & Correction", description: "Precision wet sanding to remove deep scratches and imperfections." },
  bottomPainting: { title: "Bottom Painting", description: "Antifouling bottom paint to protect against marine growth." },
  vinyl: { title: "Vinyl Removal & Installation", description: "Professional vinyl graphics removal, installation, or both." },
  weeklyMaintenance: { title: "Weekly Service", description: "Recurring wash-and-wipe maintenance at $6/ft for owners who want their boat ready every week." },
  biweeklyMaintenance: { title: "Bi-Weekly Service", description: "Recurring maintenance at $7/ft with an every-other-week cadence for clean, consistent upkeep." },
};

const BOAT_TYPE_OPTIONS = [
  { value: "bowrider", label: "Bowrider" },
  { value: "cuddy", label: "Cuddy Cabin" },
  { value: "cruiser", label: "Cruiser" },
  { value: "express", label: "Express Cruiser" },
  { value: "yacht", label: "Yacht / Multi-Cabin" },
  { value: "sailboat", label: "Sailboat" },
  { value: "pontoon", label: "Pontoon" },
  { value: "other", label: "Other" },
];

const boatTypeLabels: Record<string, string> = {
  bowrider: "Open Bow / Bowrider", cuddy: "Cuddy Cabin", cruiser: "Cruiser (Single Cabin)",
  express: "Express Cruiser", yacht: "Yacht / Multi-Cabin", sailboat: "Sailboat", pontoon: "Pontoon", other: "Other",
};

const STEPS = ["Boat Details", "Contact", "Services", "Review"];

export function QuoteFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);
  const [learnMoreService, setLearnMoreService] = useState<ServiceKey | null>(null);
  const openLearnMore = (service: ServiceKey) => { setLearnMoreService(service); setLearnMoreOpen(true); };

  const [boatDetails, setBoatDetails] = useState<{ length: number; type: string; location: string }>({
    length: 0, type: "", location: "",
  });
  const [customLocation, setCustomLocation] = useState("");
  const [marinaDetails, setMarinaDetails] = useState("");
  const [contactInfo, setContactInfo] = useState<{ fullName: string; email: string; phone: string }>({
    fullName: "", email: "", phone: "",
  });
  const [selectedServices, setSelectedServices] = useState<{
    gelcoat: boolean; exterior: boolean; interior: boolean; ceramic: boolean;
    graphene: boolean; wetSanding: boolean; bottomPainting: boolean; vinyl: boolean;
    weeklyMaintenance: boolean; biweeklyMaintenance: boolean;
  }>({
    gelcoat: false, exterior: false, interior: false, ceramic: false,
    graphene: false, wetSanding: false, bottomPainting: false, vinyl: false,
    weeklyMaintenance: false, biweeklyMaintenance: false,
  });

  const [gelcoatConfig, setGelcoatConfig] = useState<GelcoatConfig>({
    area: "hull", radarArch: false, hardTop: false, spotWetSanding: 0, heavyOxidation: false,
  });
  const [exteriorConfig, setExteriorConfig] = useState<ExteriorConfig>({
    tier: "refresh", teakCleaning: false, canvasCleaning: false, fenderCleaning: false, exteriorOzone: false,
  });
  const [interiorConfig, setInteriorConfig] = useState<InteriorConfig>({
    tier: "refresh", moldRemediation: false, mattressShampoo: false, headDeepClean: false,
    galleyDeepClean: false, petHairRemoval: false, ozoneInterior: false, photos: [], photoConfirmation: false,
  });
  const [ceramicConfig, setCeramicConfig] = useState<CeramicConfig>({
    secondLayer: false, teakCeramic: false, interiorCeramic: false,
  });
  const [grapheneConfig, setGrapheneConfig] = useState<GrapheneConfig>({
    secondLayer: false, teakGraphene: false,
  });
  const [wetSandingConfig, setWetSandingConfig] = useState<WetSandingConfig>({
    deepScratchRepair: false, spotWetSanding: 0,
  });
  const [bottomPaintingConfig, setBottomPaintingConfig] = useState<BottomPaintingConfig>({
    secondCoat: false, oldPaintRemoval: false, heavyGrowthRemoval: false, blisterRepair: false,
  });
  const [vinylConfig, setVinylConfig] = useState<VinylConfig>({
    service: "removal", customDesign: false,
  });

  const services: ServiceSelections = {};
  if (selectedServices.gelcoat) services.gelcoat = gelcoatConfig;
  if (selectedServices.exterior) services.exterior = exteriorConfig;
  if (selectedServices.interior) services.interior = interiorConfig;
  if (selectedServices.ceramic) services.ceramic = ceramicConfig;
  if (selectedServices.graphene) services.graphene = grapheneConfig;
  if (selectedServices.wetSanding) services.wetSanding = wetSandingConfig;
  if (selectedServices.bottomPainting) services.bottomPainting = bottomPaintingConfig;
  if (selectedServices.vinyl) services.vinyl = vinylConfig;
  if (selectedServices.weeklyMaintenance) services.weeklyMaintenance = { cadence: "weekly" };
  if (selectedServices.biweeklyMaintenance) services.biweeklyMaintenance = { cadence: "biweekly" };

  const estimate = boatDetails.length > 0 ? calculateTotal(boatDetails.length, boatDetails.type, services) : null;

  const hasSelectedServices = Object.values(selectedServices).some((v) => v);
  const hasRequiredFields =
    boatDetails.length > 0 && boatDetails.type && contactInfo.fullName && contactInfo.email && contactInfo.phone;
  const canBookNow = hasSelectedServices && hasRequiredFields && estimate && estimate.subtotal > 0;

  const perServiceSubtotals = useMemo(() => {
    if (!boatDetails.length) return [];
    const items: { name: string; price: number }[] = [];
    if (selectedServices.gelcoat) {
      const r = calculateGelcoat(boatDetails.length, gelcoatConfig);
      items.push({ name: "Gelcoat Restoration", price: r.subtotal });
    }
    if (selectedServices.exterior) {
      const r = calculateExterior(boatDetails.length, exteriorConfig);
      items.push({ name: "Exterior Detailing", price: r.subtotal });
    }
    if (selectedServices.interior) {
      const r = calculateInterior(boatDetails.length, boatDetails.type, interiorConfig);
      items.push({ name: "Interior Detailing", price: r.subtotal });
    }
    if (selectedServices.ceramic) {
      const r = calculateCeramic(boatDetails.length, ceramicConfig);
      items.push({ name: "Ceramic Coating", price: r.subtotal });
    }
    if (selectedServices.graphene) {
      const r = calculateGraphene(boatDetails.length, grapheneConfig);
      items.push({ name: "Graphene Nano Coating", price: r.subtotal });
    }
    if (selectedServices.wetSanding) {
      const r = calculateWetSanding(boatDetails.length, wetSandingConfig);
      items.push({ name: "Wet Sanding & Correction", price: r.subtotal });
    }
    if (selectedServices.bottomPainting) {
      const r = calculateBottomPainting(boatDetails.length, bottomPaintingConfig);
      items.push({ name: "Bottom Painting", price: r.subtotal });
    }
    if (selectedServices.vinyl) {
      const r = calculateVinyl(boatDetails.length, vinylConfig);
      items.push({ name: "Vinyl Services", price: r.subtotal });
    }
    if (selectedServices.weeklyMaintenance) {
      const r = calculateWeeklyMaintenance(boatDetails.length);
      items.push({ name: "Weekly Service", price: r.subtotal });
    }
    if (selectedServices.biweeklyMaintenance) {
      const r = calculateBiweeklyMaintenance(boatDetails.length);
      items.push({ name: "Bi-Weekly Service", price: r.subtotal });
    }
    return items;
  }, [boatDetails.length, boatDetails.type, selectedServices, gelcoatConfig, exteriorConfig, interiorConfig, ceramicConfig, grapheneConfig, wetSandingConfig, bottomPaintingConfig, vinylConfig]);

  const lineItems = useMemo(() => {
    if (!estimate) return [];
    const items: { label: string; amount: number }[] = [];
    let currentService = "";
    let serviceTotal = 0;
    for (const line of estimate.breakdown) {
      if (line.startsWith("---")) {
        if (currentService && serviceTotal > 0) {
          items.push({ label: currentService, amount: serviceTotal });
        }
        currentService = line.replace(/^-+s*/, "").replace(/s*-+$/, "").trim();
        serviceTotal = 0;
      } else {
        const match = line.match(/\$([0-9,]+(?:\.\d{2})?)\s*$/);
        if (match) {
          serviceTotal += parseFloat(match[1].replace(/,/g, ""));
        }
        const rangeMatch = line.match(/\$([0-9,]+)\s*[–-]\s*\$([0-9,]+)/);
        if (rangeMatch && !match) {
          const low = parseFloat(rangeMatch[1].replace(/,/g, ""));
          const high = parseFloat(rangeMatch[2].replace(/,/g, ""));
          serviceTotal += (low + high) / 2;
        }
      }
    }
    if (currentService && serviceTotal > 0) {
      items.push({ label: currentService, amount: serviceTotal });
    }
    if (items.length === 0 && estimate.subtotal > 0) {
      items.push({ label: "Selected Services", amount: estimate.subtotal });
    }
    return items;
  }, [estimate]);

  const toggleService = (key: ServiceKey) =>
    setSelectedServices((prev) => {
      if (key === "weeklyMaintenance") {
        return {
          ...prev,
          weeklyMaintenance: !prev.weeklyMaintenance,
          biweeklyMaintenance: false,
        };
      }

      if (key === "biweeklyMaintenance") {
        return {
          ...prev,
          biweeklyMaintenance: !prev.biweeklyMaintenance,
          weeklyMaintenance: false,
        };
      }

      return { ...prev, [key]: !prev[key] };
    });

  const canGoNext = () => {
    if (currentStep === 0) return boatDetails.length > 0 && boatDetails.type !== "";
    if (currentStep === 1) return contactInfo.fullName !== "" && contactInfo.email !== "" && contactInfo.phone !== "";
    if (currentStep === 2) return hasSelectedServices;
    return true;
  };

  const handleNext = () => {
    if (canGoNext() && currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    if (!canBookNow) return;
    setIsSubmitting(true);
    setSubmissionMessage("");

    const locationDisplay = boatDetails.location === "other"
      ? customLocation || "Other"
      : locations.find((l) => l.slug === boatDetails.location)?.name ?? boatDetails.location;

    const locationWithMarina = marinaDetails
      ? `${locationDisplay} - ${marinaDetails}`
      : locationDisplay;

    const notesPayload = [
      contactInfo.phone,
      `Location: ${locationWithMarina}`,
      `Services: ${perServiceSubtotals.map((s) => s.name).join(", ") || "None"}`,
      estimate?.breakdown?.length ? `Breakdown: ${estimate.breakdown.join(" | ")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 4900);

    try {
      const recurringPlan = selectedServices.weeklyMaintenance
        ? { type: "weekly", name: "Weekly Service", ratePerFoot: 6 }
        : selectedServices.biweeklyMaintenance
          ? { type: "biweekly", name: "Bi-Weekly Service", ratePerFoot: 7 }
          : null;

      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boatLength: String(boatDetails.length),
          boatType: boatTypeLabels[boatDetails.type] ?? boatDetails.type,
          services: perServiceSubtotals.map((s) => s.name),
          addons: [],
          contactName: contactInfo.fullName.trim(),
          contactEmail: contactInfo.email.trim(),
          contactPhone: contactInfo.phone.trim(),
          notes: notesPayload,
          locationSlug: boatDetails.location === "other" ? "other" : boatDetails.location,
          estimatedTotal: Math.round((estimate?.subtotal || 0) * 100),
          requiresManualReview: estimate?.requiresManualReview || false,
          reviewReasons: estimate?.reviewReasons || [],
          metadata: {
            maintenancePlan: recurringPlan
              ? {
                  ...recurringPlan,
                  calculatedRecurringRate: Math.round(boatDetails.length * recurringPlan.ratePerFoot * 100),
                  includes: ["pressure wash", "wipe down", "chrome polish", "window cleaning"],
                }
              : null,
          },
        }),
      });

      if (!response.ok) throw new Error("Unable to create quote request.");
      const payload = await response.json();

      window.location.href = `/booking?quoteId=${payload.id}`;
    } catch (error) {
      setSubmissionMessage(error instanceof Error ? error.message : "Unable to create quote request.");
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsDownloadingPDF(true);
    try {
      const locationDisplay = boatDetails.location === "other"
        ? customLocation || "Other"
        : locations.find((l) => l.slug === boatDetails.location)?.name ?? boatDetails.location;
      const locationWithMarina = marinaDetails
        ? `${locationDisplay} - ${marinaDetails}`
        : locationDisplay;

      const response = await fetch("/api/quotes/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: contactInfo.fullName,
          customerEmail: contactInfo.email,
          customerPhone: contactInfo.phone,
          boatLength: boatDetails.length,
          boatType: boatTypeLabels[boatDetails.type] ?? boatDetails.type,
          serviceLocation: locationWithMarina,
          services,
          estimatedTotal: Math.round((estimate?.subtotal || 0) * 100),
          breakdown: estimate?.breakdown || [],
        }),
      });
      if (!response.ok) throw new Error("Failed to generate PDF");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `A1-Quote-${contactInfo.fullName.replace(/\s+/g, "-")}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to download PDF:", error);
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  return (
    <section className="relative overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(var(--primary)/0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(148,163,184,0.12),transparent_30%)]" />

      <div className="relative page-shell py-12 md:py-16">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Waves className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">A1 Service. A1 Results.</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Configure Your Service Package
          </h1>
          <p className="mt-2 text-muted-foreground max-w-xl mx-auto">
            Premium boat care with transparent pricing. Customize your services and get an instant estimate.
          </p>
        </div>

        <div className="mb-8 max-w-2xl mx-auto">
          <ProgressBar currentStep={currentStep} />
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-start">
          <div className="space-y-8 pb-24 lg:pb-0">

            {/* ── STEP 0: BOAT DETAILS ── */}
            {currentStep === 0 && (
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Anchor className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Boat Details</h2>
                    <p className="text-xs text-muted-foreground">Tell us about your vessel</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm flex items-center gap-2">
                      <Ruler className="w-3.5 h-3.5" /> Boat Length (ft)
                    </Label>
                    <Input
                      type="number"
                      placeholder="30"
                      value={boatDetails.length || ""}
                      onChange={(e) => setBoatDetails({ ...boatDetails, length: parseInt(e.target.value) || 0 })}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm flex items-center gap-2">
                      <Ship className="w-3.5 h-3.5" /> Boat Type
                    </Label>
                    <Select value={boatDetails.type} onValueChange={(v) => setBoatDetails({ ...boatDetails, type: v })}>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {BOAT_TYPE_OPTIONS.map((type) => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-3 lg:col-span-1">
                    <Label className="text-muted-foreground text-sm flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5" /> Service Location
                    </Label>
                    <LocationCombobox
                      value={boatDetails.location}
                      onChange={(v) => setBoatDetails({ ...boatDetails, location: v })}
                      customLocation={customLocation}
                      onCustomLocationChange={setCustomLocation}
                      marinaDetails={marinaDetails}
                      onMarinaDetailsChange={setMarinaDetails}
                    />
                  </div>
                </div>
              </section>
            )}

            {/* ── STEP 1: CONTACT INFO ── */}
            {currentStep === 1 && (
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Contact Information</h2>
                    <p className="text-xs text-muted-foreground">How can we reach you?</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm flex items-center gap-2">
                      <User className="w-3.5 h-3.5" /> Full Name
                    </Label>
                    <Input
                      placeholder="Jane Smith"
                      value={contactInfo.fullName}
                      onChange={(e) => setContactInfo({ ...contactInfo, fullName: e.target.value })}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5" /> Email
                    </Label>
                    <Input
                      type="email"
                      placeholder="jane@example.com"
                      value={contactInfo.email}
                      onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5" /> Phone
                    </Label>
                    <Input
                      type="tel"
                      placeholder="(705) 996-1010"
                      value={contactInfo.phone}
                      onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* ── STEP 2: SERVICES ── */}
            {currentStep === 2 && (
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Waves className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Choose Your Services</h2>
                    <p className="text-xs text-muted-foreground">Select and configure the services you need</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-border/80 bg-card/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">One-Time Detailing Services</p>
                    <p className="mt-1 text-sm text-muted-foreground">Build your one-time detailing package below, then add a recurring Maintenance Plan separately if you would like ongoing upkeep.</p>
                  </div>
                  <ServiceCard id="gelcoat" title={SERVICE_META.gelcoat.title} description={SERVICE_META.gelcoat.description} selected={selectedServices.gelcoat} onToggle={() => toggleService("gelcoat")} onLearnMore={() => openLearnMore("gelcoat")}>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground text-sm">Coverage Area</Label>
                        <Select value={gelcoatConfig.area} onValueChange={(v: any) => setGelcoatConfig({ ...gelcoatConfig, area: v })}>
                          <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hull">Hull (Below Rub Rail)</SelectItem>
                            <SelectItem value="topsides">Topsides</SelectItem>
                            <SelectItem value="bowrider">Bowrider Special (Low Gelcoat Only)</SelectItem>
                            <SelectItem value="fullboat">Full Boat (Hull + Topsides)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <OptionToggle id="radarArch" label="Radar Arch (+$175)" checked={gelcoatConfig.radarArch} onChange={(c) => setGelcoatConfig({ ...gelcoatConfig, radarArch: c })} />
                        <OptionToggle id="hardTop" label="Hard Top (+$475)" checked={gelcoatConfig.hardTop} onChange={(c) => setGelcoatConfig({ ...gelcoatConfig, hardTop: c })} />
                        <OptionToggle id="heavyOxidation" label="Heavy Oxidation (+20%)" checked={gelcoatConfig.heavyOxidation} onChange={(c) => setGelcoatConfig({ ...gelcoatConfig, heavyOxidation: c })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground text-sm">Spot Wet Sanding Areas</Label>
                        <Input type="number" min="0" placeholder="0" value={gelcoatConfig.spotWetSanding || ""} onChange={(e) => setGelcoatConfig({ ...gelcoatConfig, spotWetSanding: parseInt(e.target.value) || 0 })} className="h-10 rounded-xl w-32" />
                        <p className="text-xs text-muted-foreground/80">$125 per area</p>
                      </div>
                    </div>
                  </ServiceCard>

                  <ServiceCard id="exterior" title={SERVICE_META.exterior.title} description={SERVICE_META.exterior.description} selected={selectedServices.exterior} onToggle={() => toggleService("exterior")} onLearnMore={() => openLearnMore("exterior")}>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-muted-foreground text-sm mb-3 block">Service Tier</Label>
                        <TierSelector tiers={EXTERIOR_TIERS} selected={exteriorConfig.tier} onSelect={(v) => setExteriorConfig({ ...exteriorConfig, tier: v as any })} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <OptionToggle id="teakCleaning" label="Teak Cleaning (+$225)" checked={exteriorConfig.teakCleaning} onChange={(c) => setExteriorConfig({ ...exteriorConfig, teakCleaning: c })} />
                        <OptionToggle id="canvasCleaning" label="Canvas Cleaning (+$150)" checked={exteriorConfig.canvasCleaning} onChange={(c) => setExteriorConfig({ ...exteriorConfig, canvasCleaning: c })} />
                        <OptionToggle id="fenderCleaning" label="Fender Cleaning (+$60)" checked={exteriorConfig.fenderCleaning} onChange={(c) => setExteriorConfig({ ...exteriorConfig, fenderCleaning: c })} />
                        <OptionToggle id="exteriorOzone" label="Exterior Ozone (+$100)" checked={exteriorConfig.exteriorOzone} onChange={(c) => setExteriorConfig({ ...exteriorConfig, exteriorOzone: c })} />
                      </div>
                    </div>
                  </ServiceCard>

                  <ServiceCard id="interior" title={SERVICE_META.interior.title} description={SERVICE_META.interior.description} selected={selectedServices.interior} onToggle={() => toggleService("interior")} onLearnMore={() => openLearnMore("interior")}>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-muted-foreground text-sm mb-3 block">Service Tier</Label>
                        <TierSelector tiers={INTERIOR_TIERS} selected={interiorConfig.tier} onSelect={(v) => setInteriorConfig({ ...interiorConfig, tier: v as any })} />
                      </div>
                      <div className="rounded-xl bg-primary/4 border border-primary/20 p-3.5">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground">Photos may be requested after booking.</span>{" "}
                          Once you reserve your preferred service date, our team may follow up and request 3–10 interior photos so we can confirm the scope and prepare properly.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <OptionToggle id="moldRemediation" label="Mold & Mildew Remediation (+$295)" checked={interiorConfig.moldRemediation} onChange={(c) => setInteriorConfig({ ...interiorConfig, moldRemediation: c })} />
                        <OptionToggle id="petHairRemoval" label="Heavy Pet Hair Removal (+$150)" checked={interiorConfig.petHairRemoval} onChange={(c) => setInteriorConfig({ ...interiorConfig, petHairRemoval: c })} />
                        {["cuddy", "cruiser", "express", "yacht"].includes(boatDetails.type) && (
                          <OptionToggle id="mattressShampoo" label="Mattress / Cushion Shampoo (+$175)" checked={interiorConfig.mattressShampoo} onChange={(c) => setInteriorConfig({ ...interiorConfig, mattressShampoo: c })} />
                        )}
                        <OptionToggle id="headDeepClean" label="Head (Bathroom) Deep Clean (+$125)" checked={interiorConfig.headDeepClean} onChange={(c) => setInteriorConfig({ ...interiorConfig, headDeepClean: c })} />
                        <OptionToggle id="galleyDeepClean" label="Galley Deep Clean (+$175)" checked={interiorConfig.galleyDeepClean} onChange={(c) => setInteriorConfig({ ...interiorConfig, galleyDeepClean: c })} />
                        {(interiorConfig.tier === "deep" || interiorConfig.tier === "restoration") && (
                          <OptionToggle id="ozoneInterior" label="Ozone Odor Treatment (+$195)" checked={interiorConfig.ozoneInterior} onChange={(c) => setInteriorConfig({ ...interiorConfig, ozoneInterior: c })} />
                        )}
                      </div>
                    </div>
                  </ServiceCard>

                  <ServiceCard id="ceramic" title={SERVICE_META.ceramic.title} description={SERVICE_META.ceramic.description} selected={selectedServices.ceramic} onToggle={() => toggleService("ceramic")} onLearnMore={() => openLearnMore("ceramic")}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <OptionToggle id="secondLayerCeramic" label="Second Layer (+$8/ft)" checked={ceramicConfig.secondLayer} onChange={(c) => setCeramicConfig({ ...ceramicConfig, secondLayer: c })} />
                      <OptionToggle id="teakCeramic" label="Teak Ceramic (+$300)" checked={ceramicConfig.teakCeramic} onChange={(c) => setCeramicConfig({ ...ceramicConfig, teakCeramic: c })} />
                      <OptionToggle id="interiorCeramic" label="Interior Ceramic (+$150)" checked={ceramicConfig.interiorCeramic} onChange={(c) => setCeramicConfig({ ...ceramicConfig, interiorCeramic: c })} />
                    </div>
                  </ServiceCard>

                  <ServiceCard id="graphene" title={SERVICE_META.graphene.title} description={SERVICE_META.graphene.description} selected={selectedServices.graphene} onToggle={() => toggleService("graphene")} onLearnMore={() => openLearnMore("graphene")}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <OptionToggle id="secondLayerGraphene" label="Second Layer (+$10/ft)" checked={grapheneConfig.secondLayer} onChange={(c) => setGrapheneConfig({ ...grapheneConfig, secondLayer: c })} />
                      <OptionToggle id="teakGraphene" label="Teak Graphene (+$350)" checked={grapheneConfig.teakGraphene} onChange={(c) => setGrapheneConfig({ ...grapheneConfig, teakGraphene: c })} />
                    </div>
                  </ServiceCard>

                  <ServiceCard id="wetSanding" title={SERVICE_META.wetSanding.title} description={SERVICE_META.wetSanding.description} selected={selectedServices.wetSanding} onToggle={() => toggleService("wetSanding")} onLearnMore={() => openLearnMore("wetSanding")}>
                    <div className="space-y-3">
                      <OptionToggle id="deepScratchRepair" label="Deep Scratch Repair (+$275)" checked={wetSandingConfig.deepScratchRepair} onChange={(c) => setWetSandingConfig({ ...wetSandingConfig, deepScratchRepair: c })} />
                      <div className="space-y-2">
                        <Label className="text-muted-foreground text-sm">Spot Wet Sanding Areas</Label>
                        <Input type="number" min="0" placeholder="0" value={wetSandingConfig.spotWetSanding || ""} onChange={(e) => setWetSandingConfig({ ...wetSandingConfig, spotWetSanding: parseInt(e.target.value) || 0 })} className="h-10 rounded-xl w-32" />
                        <p className="text-xs text-muted-foreground/80">$125 per area</p>
                      </div>
                    </div>
                  </ServiceCard>

                  <ServiceCard id="bottomPainting" title={SERVICE_META.bottomPainting.title} description={SERVICE_META.bottomPainting.description} selected={selectedServices.bottomPainting} onToggle={() => toggleService("bottomPainting")} onLearnMore={() => openLearnMore("bottomPainting")}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <OptionToggle id="secondCoat" label="2nd Coat (+$12/ft)" checked={bottomPaintingConfig.secondCoat} onChange={(c) => setBottomPaintingConfig({ ...bottomPaintingConfig, secondCoat: c })} />
                      <OptionToggle id="oldPaintRemoval" label="Old Paint Removal (+$18/ft)" checked={bottomPaintingConfig.oldPaintRemoval} onChange={(c) => setBottomPaintingConfig({ ...bottomPaintingConfig, oldPaintRemoval: c })} />
                      <OptionToggle id="heavyGrowthRemoval" label="Heavy Growth Removal (+$250)" checked={bottomPaintingConfig.heavyGrowthRemoval} onChange={(c) => setBottomPaintingConfig({ ...bottomPaintingConfig, heavyGrowthRemoval: c })} />
                      <OptionToggle id="blisterRepair" label="Blister Repair (Manual Review)" checked={bottomPaintingConfig.blisterRepair} onChange={(c) => setBottomPaintingConfig({ ...bottomPaintingConfig, blisterRepair: c })} />
                    </div>
                  </ServiceCard>

                  <ServiceCard id="vinyl" title={SERVICE_META.vinyl.title} description={SERVICE_META.vinyl.description} selected={selectedServices.vinyl} onToggle={() => toggleService("vinyl")} onLearnMore={() => openLearnMore("vinyl")}>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground text-sm">Service Type</Label>
                        <Select value={vinylConfig.service} onValueChange={(v: any) => setVinylConfig({ ...vinylConfig, service: v })}>
                          <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="removal">Removal Only</SelectItem>
                            <SelectItem value="install">Installation Only</SelectItem>
                            <SelectItem value="both">Removal + Installation</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <OptionToggle id="customDesign" label="Custom Design (+$125)" checked={vinylConfig.customDesign} onChange={(c) => setVinylConfig({ ...vinylConfig, customDesign: c })} />
                    </div>
                  </ServiceCard>

                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Maintenance Plans</p>
                    <h3 className="mt-2 text-lg font-semibold text-foreground">Ongoing premium upkeep, kept separate from one-time detailing.</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Choose one recurring cadence below if you want dockside maintenance visits scheduled automatically after your selected start date.</p>
                  </div>

                  <ServiceCard id="weeklyMaintenance" title={SERVICE_META.weeklyMaintenance.title} description={SERVICE_META.weeklyMaintenance.description} selected={selectedServices.weeklyMaintenance} onToggle={() => toggleService("weeklyMaintenance")} onLearnMore={() => openLearnMore("weeklyMaintenance")}>
                    <div className="space-y-3">
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">Included each visit</p>
                        <p className="mt-1">Pressure wash, wipe down, chrome polish, and window cleaning.</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full border border-border px-3 py-1">$6 / ft</span>
                        <span className="rounded-full border border-border px-3 py-1">Recurring weekly cadence</span>
                        <span className="rounded-full border border-border px-3 py-1">Google Calendar recurring event</span>
                      </div>
                    </div>
                  </ServiceCard>

                  <ServiceCard id="biweeklyMaintenance" title={SERVICE_META.biweeklyMaintenance.title} description={SERVICE_META.biweeklyMaintenance.description} selected={selectedServices.biweeklyMaintenance} onToggle={() => toggleService("biweeklyMaintenance")} onLearnMore={() => openLearnMore("biweeklyMaintenance")}>
                    <div className="space-y-3">
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">Included each visit</p>
                        <p className="mt-1">Pressure wash, wipe down, chrome polish, and window cleaning.</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full border border-border px-3 py-1">$7 / ft</span>
                        <span className="rounded-full border border-border px-3 py-1">Recurring bi-weekly cadence</span>
                        <span className="rounded-full border border-border px-3 py-1">Google Calendar recurring event</span>
                      </div>
                    </div>
                  </ServiceCard>
                </div>
              </section>
            )}

            {/* ── STEP 3: REVIEW ── */}
            {currentStep === 3 && (
              <section className="space-y-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Waves className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Review & Book</h2>
                    <p className="text-xs text-muted-foreground">Confirm your details and reserve your service date</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border surface-panel p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Vessel</p>
                      <p className="font-medium text-foreground">{boatDetails.length}ft {boatTypeLabels[boatDetails.type] ?? boatDetails.type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Location</p>
                      <p className="font-medium text-foreground">
                        {boatDetails.location === "other"
                          ? customLocation || "Other"
                          : locations.find((l) => l.slug === boatDetails.location)?.name ?? boatDetails.location}
                        {marinaDetails && <span className="text-muted-foreground text-xs block">{marinaDetails}</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Contact</p>
                      <p className="font-medium text-foreground">{contactInfo.fullName}</p>
                      <p className="text-muted-foreground text-xs">{contactInfo.email}</p>
                      <p className="text-muted-foreground text-xs">{contactInfo.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Services Selected</p>
                      <p className="font-medium text-foreground">{perServiceSubtotals.length > 0 ? `${perServiceSubtotals.length} service(s)` : "None"}</p>
                    </div>
                  </div>
                </div>

                {estimate && estimate.subtotal > 0 && (
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 space-y-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-widest text-primary/70">Your Estimate</p>
                      <AnimatedPrice value={estimate.subtotal} className="text-3xl font-bold text-foreground mt-1 block" />
                    </div>

                    {estimate.requiresManualReview && (
                      <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                        <p className="text-sm font-medium text-primary">Manual Review Required</p>
                        <ul className="mt-1 space-y-0.5">
                          {estimate.reviewReasons.map((r, i) => (<li key={i} className="text-xs text-muted-foreground">{r}</li>))}
                        </ul>
                      </div>
                    )}

                    {!estimate.requiresManualReview && (
                      <>
                        <div className="flex items-center justify-between py-3 border-t border-border">
                          <span className="text-sm text-muted-foreground">Booking Request</span>
                          <span className="text-lg font-semibold text-foreground">Due upon receipt</span>
                        </div>
                        <p className="text-xs text-muted-foreground/80">Reserve your preferred date now and our team will follow up to confirm scheduling, scope, and final service details. Payment is due in full upon completion of service.</p>
                      </>
                    )}

                    {estimate.breakdown.length > 0 && (
                      <details className="group">
                        <summary className="text-xs font-medium text-primary/60 cursor-pointer hover:text-primary/80 transition-colors select-none flex items-center justify-between">
                          View Breakdown
                          <svg className="w-3 h-3 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </summary>
                        <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                          {estimate.breakdown.map((line, i) => (<p key={i} className={`text-xs ${line.startsWith("---") ? "font-semibold text-primary mt-2 first:mt-0" : "text-muted-foreground"}`}>{line}</p>))}
                        </div>
                      </details>
                    )}
                  </div>
                )}

                {submissionMessage && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {submissionMessage}
                  </div>
                )}
              </section>
            )}

            {/* ── NAVIGATION BUTTONS ── */}
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={currentStep === 0}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>

              {currentStep < STEPS.length - 1 ? (
                <Button
                  onClick={handleNext}
                  disabled={!canGoNext()}
                  className="gap-2 font-semibold"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!canBookNow || isSubmitting}
                  className="gap-2 font-semibold"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing...</>
                  ) : estimate?.requiresManualReview ? (
                    "Book Now (Review Required)"
                  ) : (
                    <>
                      Book Now
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              )}
            </div>

          </div>

          <StickyPricePanel
            lineItems={lineItems}
            subtotal={estimate?.subtotal || 0}
            requiresManualReview={estimate?.requiresManualReview || false}
            reviewReasons={estimate?.reviewReasons || []}
            breakdown={estimate?.breakdown || []}
            canSubmit={!!canBookNow}
            isSubmitting={isSubmitting}
            isDownloadingPDF={isDownloadingPDF}
            onSubmit={handleSubmit}
            onDownloadPDF={handleDownloadPDF}
          />
        </div>
      </div>

      <LearnMoreModal open={learnMoreOpen} onOpenChange={setLearnMoreOpen} service={learnMoreService} />
    </section>
  );
}
