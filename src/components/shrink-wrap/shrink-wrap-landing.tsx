import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Clock, MapPin, Phone, Shield, Snowflake, Star, Wind, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SchemaScript } from "@/components/site/schema-script";
import { ShrinkWrapQuoteForm } from "@/components/shrink-wrap/shrink-wrap-quote-form";
import { company, getServiceBySlug, locations, type Location } from "@/content/site";
import { serviceSchema } from "@/lib/schema";
import { absoluteUrl } from "@/lib/seo";
import { formatCents, SHRINK_WRAP, SHRINK_WRAP_PRICE_LABEL } from "@/lib/shrink-wrap-pricing";

export const SHRINK_WRAP_FAQ: Array<{ q: string; a: string }> = [
  {
    q: "Do I have to bring the boat anywhere?",
    a: "No. That's the point. We wrap it where it sits — your driveway, your dock, a marina slip, or a storage lot. If it's on a trailer or a lift, we work around it.",
  },
  {
    q: "How is the price calculated?",
    a: `Overall length × ${formatCents(SHRINK_WRAP.rateCents)}/ft, with a ${formatCents(SHRINK_WRAP.minimumCents)} minimum. Pontoons and tritoons carry a per-foot surcharge for the extra film and framing a wide deck needs. HST is added. There are no travel fees inside our service area.`,
  },
  {
    q: "What's included in the wrap?",
    a: "A built-up support frame with a peaked ridge so snow and meltwater run off, commercial white heat-shrink film pulled tight and sealed, vents to keep air moving and mould out, and a belly band and bottom strapping so wind can't get under it. Towers, arches, and outboards are framed around, not flattened.",
  },
  {
    q: "Can you winterize the engine in the same visit?",
    a: "Yes — tick the winterization box on the quote. We stabilize fuel, run antifreeze through the cooling system, fog the cylinders, and service the drive or lower unit before the wrap goes on. Flat rate by engine type; additional engines are discounted.",
  },
  {
    q: "When should I book?",
    a: "Once you've had your last run of the season. Most Georgian Bay boats get wrapped between late September and early November. Our calendar fills by mid-October, so book the week you decide you're done.",
  },
  {
    q: "What if the wrap gets damaged over the winter?",
    a: "If severe weather damages a wrap we installed, we'll make reasonable repairs at no charge during the season — just call us.",
  },
  {
    q: "Do you remove the wrap in spring?",
    a: "We can. Spring removal and disposal is a separate flat service; ask on the call and we'll put it on the same booking.",
  },
];

const STEPS = [
  { icon: Phone, title: "Get your number", body: "Boat length, hull type, and where it sits. Your price shows before you type your name." },
  { icon: Clock, title: "We confirm a date", body: "A call within one business hour. Most jobs are scheduled within the week." },
  { icon: Wrench, title: "We show up and frame it", body: "Support frame, peaked ridge, and every arch, tower, and outboard framed around." },
  { icon: Snowflake, title: "Wrapped, vented, done", body: "Heat-shrunk tight, vented, belly-banded. You go back inside. Done in an afternoon." },
];

const INCLUDED = [
  "Built-up support frame with a peaked ridge — snow slides off",
  "Commercial white heat-shrink film, not a hardware-store tarp",
  "Vents installed to stop moisture, mould, and mildew",
  "Belly band and bottom strapping so wind can't lift it",
  "Bow, stern, towers, arches, and outboards framed and wrapped",
  "Optional zipper door so you can get aboard mid-winter",
];

interface Props {
  location?: Location;
}

export function ShrinkWrapLanding({ location }: Props) {
  const service = getServiceBySlug("shrink-wrapping")!;
  const areaLabel = location ? location.name : "Georgian Bay, Lake Simcoe & Muskoka";
  const schema = serviceSchema(service, location);
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: SHRINK_WRAP_FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Shrink Wrapping", item: absoluteUrl("/shrink-wrapping") },
      ...(location
        ? [{ "@type": "ListItem", position: 3, name: location.name, item: absoluteUrl(`/shrink-wrapping/${location.slug}`) }]
        : []),
    ],
  };
  const phoneHref = `tel:${company.phone.replace(/\D/g, "")}`;

  return (
    <>
      <SchemaScript schema={schema} />
      <SchemaScript schema={faqSchema} />
      <SchemaScript schema={breadcrumbSchema} />

      {/* HERO + FORM */}
      <section className="relative isolate overflow-hidden bg-[#03111c]">
        <div className="absolute inset-0">
          <Image
            src="/images/services/shrink-wrapping.jpg"
            alt="Heat gun shrinking white wrap film tight over a boat hull"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#03111c]/97 via-[#03111c]/88 to-[#03111c]/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#03111c] via-[#03111c]/30 to-transparent" />
        </div>
        <div className="absolute left-[-6rem] top-24 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />

        <div className="page-shell relative z-10 py-14 lg:py-20">
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_30rem] lg:gap-14">
            <div className="max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary/80">
                Mobile shrink wrapping{location ? ` · ${location.name}` : ""}
              </p>
              <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Boat shrink wrap, done in your driveway{location ? ` in ${location.name}` : ""}.
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-white/75 md:text-xl">
                Your boat doesn&apos;t have to go anywhere. We come to your driveway, dock, or marina slip
                {location ? ` anywhere around ${location.name}` : " across " + areaLabel}, frame it properly, and shrink it tight.
                Add engine winterization and the whole thing is handled in one visit.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-white">
                  <Star className="h-4 w-4 text-primary" /> {SHRINK_WRAP_PRICE_LABEL}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white">
                  <MapPin className="h-4 w-4 text-primary" /> We come to you
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white">
                  <Clock className="h-4 w-4 text-primary" /> Done in an afternoon
                </span>
              </div>

              {/* Mobile: the form is below — one tap gets them there. */}
              <div className="mt-6 lg:hidden">
                <Button asChild size="lg" className="w-full gap-2 text-base">
                  <a href="#quote">
                    Get my price in 30 seconds <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>

              <div className="mt-9 hidden gap-4 sm:grid sm:grid-cols-3">
                {[
                  ["20 ft", formatCents(20 * SHRINK_WRAP.rateCents)],
                  ["24 ft", formatCents(24 * SHRINK_WRAP.rateCents)],
                  ["28 ft", formatCents(28 * SHRINK_WRAP.rateCents)],
                ].map(([ft, price]) => (
                  <div key={ft} className="rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-sm">
                    <p className="text-xs uppercase tracking-[0.14em] text-white/50">{ft} boat</p>
                    <p className="mt-1 text-2xl font-bold text-white">{price}</p>
                    <p className="text-xs text-white/50">wrap only, + HST</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/65 lg:mt-8">
                <span className="inline-flex items-center gap-2">
                  <Star className="h-4 w-4 fill-primary text-primary" /> 5.0 Google rating
                </span>
                <span>500+ boats cared for</span>
                <span>Boater-owned, Midland ON</span>
                <a href={phoneHref} className="inline-flex items-center gap-2 text-white hover:text-primary">
                  <Phone className="h-4 w-4 text-primary" /> {company.phone}
                </a>
              </div>
            </div>

            <div id="quote" className="scroll-mt-24">
              <ShrinkWrapQuoteForm defaultLocationSlug={location?.slug} />
            </div>
          </div>
        </div>
      </section>

      {/* WHY MOBILE */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.18)_100%)] py-20">
        <div className="page-shell">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.15em] text-primary/80">Why private wrapping</p>
              <h2 className="mt-3 text-3xl font-semibold text-foreground md:text-4xl">No trailering. No yard drop-off. No waiting around.</h2>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                Every other option around {location ? location.name : "Georgian Bay"} starts with &ldquo;bring it to us.&rdquo; That means hitching up,
                towing, a drop-off appointment, and a pickup in spring. We skip all of it. The boat stays exactly where it lives, and the
                same crew that restores gelcoat for a living wraps it — properly framed, properly vented, properly tight.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Button asChild size="lg" className="gap-2">
                  <a href="#quote">
                    Get my price <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg" className="gap-2">
                  <a href={phoneHref}>
                    <Phone className="h-4 w-4" /> {company.phone}
                  </a>
                </Button>
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-[#03111c] p-8 text-white shadow-2xl shadow-black/20">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">What&apos;s included in every wrap</p>
              <ul className="mt-5 space-y-3">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-6 text-white/85">
                    <span className="mt-1 rounded-full bg-primary/15 p-1">
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t border-white/10 pt-4 text-xs text-white/50">
                Severe-weather damage to a wrap we installed? We make reasonable repairs at no charge during the season.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="bg-surface-ocean py-20 text-white">
        <div className="page-shell">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.15em] text-primary/80">Pricing, up front</p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl">No &ldquo;call for a quote.&rdquo; Here&apos;s the rate card.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-[1.75rem] border border-primary/30 bg-primary/10 p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Mobile shrink wrap</p>
              <p className="mt-3 text-4xl font-bold">
                {formatCents(SHRINK_WRAP.rateCents)}
                <span className="text-lg font-medium text-white/60">/ft</span>
              </p>
              <p className="mt-1 text-sm text-white/65">{formatCents(SHRINK_WRAP.minimumCents)} minimum · overall length</p>
              <p className="mt-4 text-sm text-white/75">
                Pontoon +{formatCents(SHRINK_WRAP.hullSurchargePerFootCents.pontoon)}/ft · Tritoon +{formatCents(SHRINK_WRAP.hullSurchargePerFootCents.tritoon)}/ft
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Winterization add-on</p>
              <ul className="mt-3 space-y-2 text-sm">
                {(["outboard", "sterndrive", "inboard"] as const).map((k) => (
                  <li key={k} className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-white/80">{SHRINK_WRAP.winterization[k].label.replace("Winterization — ", "")}</span>
                    <span className="font-semibold">{formatCents(SHRINK_WRAP.winterization[k].rateCents)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-white/55">Per engine. Additional engines at {Math.round(SHRINK_WRAP.additionalEngineMultiplier * 100)}%.</p>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Worked example</p>
              <p className="mt-3 text-sm text-white/80">24 ft bowrider, single sterndrive, wrap + winterization:</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-white/80">Wrap 24 × {formatCents(SHRINK_WRAP.rateCents)}</span>
                  <span>{formatCents(24 * SHRINK_WRAP.rateCents)}</span>
                </li>
                <li className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-white/80">Sterndrive winterization</span>
                  <span>{formatCents(SHRINK_WRAP.winterization.sterndrive.rateCents)}</span>
                </li>
                <li className="flex justify-between pt-1 font-semibold">
                  <span>Total before HST</span>
                  <span className="text-primary">{formatCents(24 * SHRINK_WRAP.rateCents + SHRINK_WRAP.winterization.sterndrive.rateCents)}</span>
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-6 text-xs text-white/50">
            Prices in CAD, HST extra. Confirmed against actual overall length on site. Boats over {SHRINK_WRAP.maxLengthFt} ft are quoted individually.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20">
        <div className="page-shell">
          <div className="mb-10 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.15em] text-primary/80">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold text-foreground md:text-4xl">Four steps. One afternoon.</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <div key={step.title} className="rounded-[1.75rem] border border-border/60 bg-card/75 p-7 shadow-lg shadow-black/5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <step.icon className="h-5 w-5 text-primary" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Step {i + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BAD WRAP vs GOOD WRAP */}
      <section className="bg-[#03111c] py-20 text-white">
        <div className="page-shell grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.15em] text-primary/80">Why the frame matters</p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl">A cheap wrap costs more than a good one.</h2>
            <p className="mt-5 text-lg leading-relaxed text-white/70">
              A sagging wrap collects rain, freezes, and caves in on the windshield in January. A wrap with no vents grows mould
              on every cushion by March. We see both every spring — and both are avoidable with a proper peaked frame, real vents,
              and film that&apos;s actually shrunk tight instead of draped.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-white/80">
              <li className="flex items-start gap-3">
                <Wind className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Vents sized to the boat, not one token port
              </li>
              <li className="flex items-start gap-3">
                <Snowflake className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Peaked ridge so snow load runs off instead of pooling
              </li>
              <li className="flex items-start gap-3">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Padding on every sharp corner so the film never chafes through
              </li>
            </ul>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl shadow-black/40 lg:aspect-[5/4]">
            <Image
              src="/images/services/shrink-wrapping.jpg"
              alt="Tight, sealed shrink wrap over a boat with a heat gun finishing the seam"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      {/* SERVICE AREA */}
      <section className="py-20">
        <div className="page-shell">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.15em] text-primary/80">Where we wrap</p>
            <h2 className="mt-3 text-3xl font-semibold text-foreground md:text-4xl">
              {location ? `${location.name} and everywhere around it.` : "Georgian Bay, Lake Simcoe, and Muskoka."}
            </h2>
            <p className="mt-4 text-muted-foreground">
              Based in Midland. No travel fee anywhere in the areas below — if you&apos;re outside them, send the quote anyway and we&apos;ll
              tell you on the call.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {locations.map((l) => (
              <Link
                key={l.slug}
                href={`/shrink-wrapping/${l.slug}`}
                className={
                  l.slug === location?.slug
                    ? "rounded-full border border-primary bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary"
                    : "rounded-full border border-border/60 bg-card/60 px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                }
              >
                {l.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.18)_100%)] py-20">
        <div className="page-shell grid gap-10 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.15em] text-primary/80">Questions</p>
            <h2 className="mt-3 text-3xl font-semibold text-foreground">Straight answers.</h2>
          </div>
          <div className="divide-y divide-border/60 rounded-[1.75rem] border border-border/60 bg-card/60">
            {SHRINK_WRAP_FAQ.map((f) => (
              <details key={f.q} className="group px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-foreground">
                  {f.q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-[#03111c] py-20 text-white">
        <div className="page-shell">
          <div className="rounded-[2.5rem] border border-white/10 bg-white/5 px-8 py-12 text-center shadow-2xl shadow-black/25 md:px-12">
            <h2 className="text-3xl font-bold md:text-5xl">First frost doesn&apos;t wait.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/60">
              The wrap calendar fills by mid-October. Get your number now, pick a date, and you&apos;re done for the year.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="gap-2">
                <a href="#quote">
                  Get my price <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="heroOutline" size="lg" className="gap-2 border-white/30 text-white hover:bg-white/10">
                <a href={phoneHref}>
                  <Phone className="h-4 w-4" /> Call {company.phone}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
