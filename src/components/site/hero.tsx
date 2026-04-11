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
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/55 to-black/20" />
      <div className="page-shell relative py-24 md:py-36">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-200">A1 Marine Care</p>
        <h1 className="text-hero-glow mt-4 max-w-5xl text-5xl font-black leading-[0.95] md:text-7xl">{title}</h1>
        <p className="text-hero-glow mt-7 max-w-2xl text-base text-cyan-50/95 md:text-xl">{description}</p>
        <div className="mt-7 flex flex-wrap gap-3 text-xs uppercase tracking-[0.12em] text-cyan-100/90">
          <span className="rounded-full border border-white/25 bg-white/5 px-3 py-1">Mobile Dockside Service</span>
          <span className="rounded-full border border-white/25 bg-white/5 px-3 py-1">Fully Insured Team</span>
          <span className="rounded-full border border-white/25 bg-white/5 px-3 py-1">Georgian Bay • Muskoka • Lake Simcoe</span>
        </div>
        <div className="mt-10 flex flex-wrap gap-4">
          <Button size="lg" className="h-12 px-10 text-base font-semibold shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_20px_45px_-20px_rgba(56,208,255,0.7)]" variant="secondary" asChild>
            <Link href={primaryHref}>{primaryLabel}</Link>
          </Button>
          <Button size="lg" variant="outline" className="h-12 border-white/60 bg-black/30 px-10 text-base font-semibold text-white hover:bg-white/10" asChild>
            <Link href={secondaryHref}>{secondaryLabel}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
