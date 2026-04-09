import type { ServiceKey } from "@/components/quote/ServiceCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LearnMoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceKey | null;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="w-1 h-5 rounded-full bg-primary" />
      <h3 className="text-[15px] font-semibold text-foreground tracking-wide">{children}</h3>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 pl-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function TierCard({
  name,
  multiplier,
  description,
  includes,
  bestFor,
}: {
  name: string;
  multiplier: string;
  description: string;
  includes: string[];
  bestFor: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[15px] font-semibold text-foreground">{name}</h4>
        <span className="text-xs font-mono font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
          {multiplier}
        </span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      {includes.length > 0 && (
        <ul className="space-y-1.5 pl-1">
          {includes.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground/80">
              <span className="mt-1 h-1 w-1 rounded-full bg-primary/60 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-primary/70 italic">Best for: {bestFor}</p>
    </div>
  );
}

function CoverageBlock({
  title,
  description,
  includes,
}: {
  title: string;
  description: string;
  includes?: string[];
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      {includes && includes.length > 0 && (
        <ul className="space-y-1.5 pl-1 pt-1">
          {includes.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground/80">
              <span className="mt-1 h-1 w-1 rounded-full bg-primary/60 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BowriderCallout() {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/4 p-5 space-y-3 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
      <h4 className="text-sm font-semibold text-foreground pl-3">Bowrider Special</h4>
      <p className="text-sm text-muted-foreground leading-relaxed pl-3">
        Bowrider boats typically have far less gelcoat surface above the rub rail because large
        portions of the boat are made up of windshield, vinyl seating, and an open bow layout.
        Instead of charging full topside pricing, we apply a <strong className="text-foreground">40% reduction</strong> to the topside portion.
      </p>
      <div className="ml-3 bg-black/40 border border-primary/20 rounded-lg px-4 py-3 font-mono text-sm text-primary text-center">
        Bowrider Price = Hull Price + (Topside Price &times; 0.6)
      </div>
      <p className="text-xs text-muted-foreground/80 pl-3 italic">
        Bowrider pricing applies to select vessels only and may be confirmed by a technician.
      </p>
    </div>
  );
}

function PricingNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-t border-border pt-5 mt-2 space-y-2">
      <p className="text-xs text-muted-foreground leading-relaxed">{children}</p>
      <p className="text-xs text-primary/60 italic">
        Select this service in the form to include it in your estimate.
      </p>
    </div>
  );
}

type ServiceData = {
  title: string;
  subtitle: string;
  overview: string;
  render: () => React.ReactNode;
};

const SERVICE_DATA: Record<ServiceKey, ServiceData> = {
  gelcoat: {
    title: "Gelcoat Restoration",
    subtitle: "What's included, coverage options, and how pricing works",
    overview:
      "Gelcoat Restoration restores gloss, removes oxidation, and dramatically improves the overall finish of your fiberglass surfaces. Whether you need hull-only work below the rub rail or a complete full-boat restoration, this service brings your vessel back to a showroom-quality shine.",
    render: () => (
      <>
        <SectionHeading>Coverage Options</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CoverageBlock
            title="Hull Only"
            description="Below the rub rail. Full compound, polish, acid wash, and sealant."
            includes={["Multi-stage compound & polish", "Waterline acid wash", "Final gloss sealant"]}
          />
          <CoverageBlock
            title="Topsides Only"
            description="Above the rub rail. Includes a complimentary exterior wash."
            includes={["Free exterior wash", "Hand polish of rails & accents"]}
          />
          <CoverageBlock
            title="Full Boat"
            description="Complete hull and topsides restoration. No discounts — full coverage at full quality."
          />
        </div>
        <BowriderCallout />
        <SectionHeading>Available Add-Ons</SectionHeading>
        <BulletList
          items={[
            "Arch / Radar Arch — $175",
            "Hard Top — $350 – $600",
            "Spot Wet Sanding — $75 – $150 per area",
            "Heavy Oxidation Treatment — +15% – +25% surcharge",
          ]}
        />
        <PricingNote>
          Coverage options affect total pricing. Pricing is calculated per foot based on your boat length and selected coverage area.
        </PricingNote>
      </>
    ),
  },

  exterior: {
    title: "Exterior Detailing",
    subtitle: "Tiers, what's included, and how to choose the right package",
    overview:
      "Professional exterior cleaning, polishing, and protection for your vessel's outer surfaces. Choose the tier that best matches your boat's current condition — from a quick refresh to a full restoration.",
    render: () => (
      <>
        <SectionHeading>Service Tiers</SectionHeading>
        <div className="grid grid-cols-1 gap-3">
          <TierCard name="Refresh" multiplier="1.0x" description="A light exterior clean and polish to maintain an already well-kept boat." includes={["Exterior wash & dry", "Light hand polish", "Spray sealant finish"]} bestFor="Well-maintained boats that need a quick touch-up" />
          <TierCard name="Standard" multiplier="1.2x" description="A thorough exterior detail with decontamination and hand polish." includes={["Full wash & clay bar treatment", "Hand polish with sealant", "Chrome & metal brightening"]} bestFor="Boats with light oxidation or seasonal build-up" />
          <TierCard name="Deep Clean" multiplier="1.4x" description="Intensive decontamination and multi-stage polishing for boats that need serious attention." includes={["Intensive decontamination", "Multi-stage compound & polish", "Premium sealant application"]} bestFor="Boats with moderate oxidation, staining, or neglect" />
          <TierCard name="Restoration" multiplier="1.6x" description="Complete exterior restoration for heavily oxidised or neglected surfaces." includes={["Full oxidation removal", "Heavy compound & correction", "Multi-layer sealant protection"]} bestFor="Heavily neglected boats requiring significant correction" />
        </div>
        <SectionHeading>Available Add-Ons</SectionHeading>
        <BulletList items={["Teak Cleaning & Brightening", "Canvas & Enclosure Cleaning", "Fender Cleaning", "Exterior Ozone Treatment"]} />
        <PricingNote>Choose the tier that best matches your boat's current condition. Pricing is calculated per foot multiplied by the tier rate.</PricingNote>
      </>
    ),
  },

  interior: {
    title: "Interior Detailing",
    subtitle: "Tiers, add-ons, and what affects your interior estimate",
    overview:
      "Thorough interior cleaning and restoration tailored to your boat type and condition. From a quick cabin refresh to a full deep-clean restoration, we handle every surface, fabric, and compartment.",
    render: () => (
      <>
        <SectionHeading>Service Tiers</SectionHeading>
        <div className="grid grid-cols-1 gap-3">
          <TierCard name="Refresh" multiplier="1.0x" description="A light interior clean for boats in good condition." includes={["Vacuum all surfaces", "Wipe-down of hard surfaces", "Surface sanitisation"]} bestFor="Recently cleaned boats or quick seasonal prep" />
          <TierCard name="Standard" multiplier="1.25x" description="Full interior detail including upholstery and surface treatment." includes={["Full vacuum & dusting", "Upholstery cleaning", "Surface treatment & conditioning"]} bestFor="Boats with normal wear and light soiling" />
          <TierCard name="Deep Clean" multiplier="1.5x" description="Intensive deep cleaning of all interior surfaces, fabrics, and compartments." includes={["Deep fabric extraction", "Compartment cleaning", "Mildew treatment", "Full surface restoration"]} bestFor="Boats with noticeable dirt, odors, or mildew" />
          <TierCard name="Restoration" multiplier="1.75x" description="Complete interior restoration for heavily soiled or neglected cabins." includes={["Full extraction & sanitisation", "Stain removal", "Odor elimination", "Complete surface restoration"]} bestFor="Heavily neglected interiors requiring extensive work" />
        </div>
        <SectionHeading>Available Add-Ons</SectionHeading>
        <BulletList items={["Advanced Mold & Mildew Remediation", "Heavy Pet Hair Removal", "Cabin Mattress / Cushion Shampoo", "Head (Bathroom) Deep Clean", "Galley Deep Clean", "Ozone Odor Treatment"]} />
        <PricingNote>Pricing depends on boat size, condition, and selected tier. Larger cabin layouts and multi-cabin vessels require more time and materials. Interior estimates are photo-verified before final confirmation.</PricingNote>
      </>
    ),
  },

  ceramic: {
    title: "Ceramic Coating",
    subtitle: "What's included, options, and how it protects your boat",
    overview:
      "Professional-grade ceramic coating creates a durable hydrophobic barrier that shields your vessel from UV damage, salt spray, and environmental contaminants. Provides up to 2 years of protection with proper maintenance.",
    render: () => (
      <>
        <SectionHeading>What's Included</SectionHeading>
        <BulletList items={["Full surface preparation & decontamination", "Professional ceramic coating application to all exterior gelcoat and painted surfaces", "Hydrophobic finish for easy wash-downs", "UV and salt protection for up to 2 years"]} />
        <SectionHeading>Available Add-Ons</SectionHeading>
        <BulletList items={["Second Layer — Additional durability and depth of gloss", "Teak Ceramic Coating — Protects and seals teak surfaces", "Interior Ceramic — Protects interior gelcoat and hard surfaces"]} />
        <PricingNote>Ceramic coating is priced per foot of boat length. Add-ons are applied on top of the base coating price.</PricingNote>
      </>
    ),
  },

  graphene: {
    title: "Graphene Nano Coating",
    subtitle: "What's included, options, and why graphene outperforms ceramic",
    overview:
      "Next-generation graphene-infused coating offering superior hardness, heat resistance, and anti-static properties. Graphene reduces water spotting and lasts longer than traditional ceramic coatings — the ultimate protection for your vessel.",
    render: () => (
      <>
        <SectionHeading>What's Included</SectionHeading>
        <BulletList items={["Full surface preparation & decontamination", "Advanced graphene nano coating on all exterior surfaces", "Enhanced scratch resistance & anti-static properties", "Reduced water spotting compared to ceramic", "Extended durability beyond traditional coatings"]} />
        <SectionHeading>Available Add-Ons</SectionHeading>
        <BulletList items={["Second Layer — Maximum protection and gloss depth", "Teak Graphene Coating — Protects and enhances teak surfaces"]} />
        <PricingNote>Graphene coating is priced per foot of boat length. Add-ons are applied on top of the base coating price.</PricingNote>
      </>
    ),
  },

  wetSanding: {
    title: "Wet Sanding & Paint Correction",
    subtitle: "What's included, options, and when you need it",
    overview:
      "Precision wet sanding and multi-stage paint correction to remove deep scratches, orange peel, and surface imperfections. This service restores a factory-smooth finish to damaged or deteriorated gelcoat and painted surfaces.",
    render: () => (
      <>
        <SectionHeading>What's Included</SectionHeading>
        <BulletList items={["Progressive grit wet sanding", "Multi-stage compounding & polishing", "Surface leveling for orange peel removal", "Factory-smooth finish restoration"]} />
        <SectionHeading>Available Add-Ons</SectionHeading>
        <BulletList items={["Deep Scratch Repair — Targeted repair of deep gouges and scratches", "Spot Wet Sanding — Focused correction on specific problem areas"]} />
        <PricingNote>Wet sanding is priced per foot of boat length. Add-ons are applied on top of the base service price.</PricingNote>
      </>
    ),
  },

  bottomPainting: {
    title: "Bottom Painting",
    subtitle: "What's included, options, and how to protect your hull",
    overview:
      "Professional antifouling bottom paint application to protect your hull from marine growth, barnacles, and corrosion. Keeps your boat performing efficiently and reduces long-term maintenance costs.",
    render: () => (
      <>
        <SectionHeading>What's Included</SectionHeading>
        <BulletList items={["Surface preparation & cleaning", "Priming (if needed)", "High-quality antifouling bottom paint application", "Haul-out coordination if required"]} />
        <SectionHeading>Available Add-Ons</SectionHeading>
        <BulletList items={["Second Coat — Additional layer for extended protection", "Old Paint Removal — Stripping of existing bottom paint", "Heavy Growth Removal — Barnacle and marine growth removal", "Blister Repair — Osmotic blister assessment and repair (requires manual review)"]} />
        <PricingNote>Bottom painting is priced per foot of boat length. Add-ons are applied on top of the base paint application price.</PricingNote>
      </>
    ),
  },

  vinyl: {
    title: "Vinyl Removal & Installation",
    subtitle: "Service options, add-ons, and how pricing works",
    overview:
      "Professional vinyl wrap removal, installation, or both for boat graphics, names, and custom designs. Clean, precise work that protects your gelcoat and delivers a flawless finish.",
    render: () => (
      <>
        <SectionHeading>Service Options</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <CoverageBlock title="Removal Only" description="Clean removal of existing vinyl graphics and all adhesive residue." />
          <CoverageBlock title="Installation Only" description="Professional application of new vinyl graphics or wraps." />
          <CoverageBlock title="Removal + Installation" description="Full service: remove old graphics and apply new ones." />
        </div>
        <SectionHeading>Available Add-Ons</SectionHeading>
        <BulletList items={["Custom Design — Custom graphic design for boat names, logos, or wraps"]} />
        <PricingNote>Vinyl services are priced per foot of boat length based on the selected service type. Custom design is an additional flat fee.</PricingNote>
      </>
    ),
  },
};

export default function LearnMoreModal({ open, onOpenChange, service }: LearnMoreModalProps) {
  if (!service) return null;
  const data = SERVICE_DATA[service];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[860px] max-h-[90vh] p-0 overflow-hidden border border-border bg-card shadow-2xl shadow-black/60" style={{ borderRadius: 18 }}>
        <ScrollArea className="max-h-[90vh]">
          <div className="p-7 sm:p-9 space-y-6">
            <DialogHeader className="space-y-1.5">
              <DialogTitle className="text-2xl font-bold text-foreground tracking-tight">{data.title}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed">{data.subtitle}</DialogDescription>
            </DialogHeader>
            <div className="h-px bg-gradient-to-r from-primary/50 via-primary/20 to-transparent" />
            <p className="text-sm text-muted-foreground leading-relaxed">{data.overview}</p>
            {data.render()}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
