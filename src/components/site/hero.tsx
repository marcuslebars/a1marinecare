import Link from "next/link";

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
      <div className="absolute inset-0 bg-hero-overlay" />
      <div className="page-shell relative py-20 md:py-28">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-200">A1 Marine Care Platform</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">{title}</h1>
        <p className="mt-6 max-w-2xl text-base text-cyan-50/90 md:text-lg">{description}</p>
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
