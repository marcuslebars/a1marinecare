import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";

type HeroProps = {
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
};

export function Hero({
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-surface-deep text-white">
      <Image
        src="/images/hero/hero-main.jpg"
        alt="Premium boat detailing in Georgian Bay"
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-hero-overlay" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/45 to-black/30" />
      <div className="absolute -left-24 top-8 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -right-20 bottom-6 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
      <div className="page-shell relative py-24 md:py-32">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-200">A1 Marine Care</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">{title}</h1>
        <p className="mt-6 max-w-2xl text-base text-cyan-50/90 md:text-lg">{description}</p>
        <div className="mt-7 flex flex-wrap gap-3 text-xs uppercase tracking-[0.12em] text-cyan-100/90">
          <span className="rounded-full border border-white/25 bg-white/5 px-3 py-1">Mobile Dockside Service</span>
          <span className="rounded-full border border-white/25 bg-white/5 px-3 py-1">Fully Insured Team</span>
          <span className="rounded-full border border-white/25 bg-white/5 px-3 py-1">Georgian Bay • Muskoka • Lake Simcoe</span>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button variant="secondary" asChild>
            <Link href={primaryHref}>{primaryLabel}</Link>
          </Button>
          <Button variant="outline" className="border-white/40 bg-white/5 text-white hover:bg-white/10" asChild>
            <Link href={secondaryHref}>{secondaryLabel}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
