import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, Zap, Shield, ArrowRight, Scan } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BoatPreviewForm } from "@/components/preview/boat-preview-form";
import { absoluteUrl, buildTitle, buildDescription } from "@/lib/seo";

export const metadata: Metadata = {
  title: buildTitle("Preview Your Boat's Potential"),
  description: buildDescription(
    "Upload a photo of your boat and see an AI-powered preview of what it could look like after our professional detailing, ceramic coating, or restoration services."
  ),
  alternates: {
    canonical: absoluteUrl("/preview"),
  },
};

const howItWorks = [
  {
    step: "01",
    title: "Upload Your Photo",
    description: "Share a photo of your boat as it looks today. Show the areas you'd like to improve.",
  },
  {
    step: "02",
    title: "Select a Service",
    description: "Choose the treatment you're considering — from detailing to full restoration.",
  },
  {
    step: "03",
    title: "See the Potential",
    description: "Our AI generates a realistic preview showing what your boat could look like after service.",
  },
];

const benefits = [
  {
    icon: Zap,
    title: "Instant Visualization",
    description: "See potential results in seconds, not after the fact.",
  },
  {
    icon: Shield,
    title: "Honest Expectations",
    description: "Previews are realistic — we show you what we can realistically achieve.",
  },
  {
    icon: Sparkles,
    title: "Motivates Action",
    description: "A clear vision of the end result makes booking easier.",
  },
];

export default function PreviewPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-black py-20 md:py-28">
        <div className="absolute inset-0">
          <Image
            src="/images/marinas/marina-2.jpg"
            alt="Premium marina setting"
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black" />
        </div>

        <div className="page-shell relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI-Powered Preview</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight">
              Preview Your Boat&apos;s Potential
            </h1>
            <p className="mt-6 text-lg text-white/70 leading-relaxed">
              Upload a photo of your boat and see what it could look like after our professional
              detailing, correction, or protection services. No commitment — just a glimpse of what
              your vessel could become.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-neutral-950 py-16 md:py-20">
        <div className="page-shell">
          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((item) => (
              <div key={item.step} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary font-bold text-lg mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-white/60">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-black py-16 md:py-24">
        <div className="page-shell">
          <BoatPreviewForm />
        </div>
      </section>

      <section className="bg-neutral-950 py-16 md:py-20">
        <div className="page-shell">
          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((item) => (
              <div key={item.title} className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                  <p className="text-sm text-white/60">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-surface-ocean">
        <div className="page-shell text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Ready to See It for Real?
          </h2>
          <p className="mt-4 text-white/60 max-w-lg mx-auto">
            The AI preview is just the start. Book a service and let us show you the actual
            difference we can make.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/quote">
                Get Your Quote <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="heroOutline"
              size="lg"
              className="gap-2 border-white/30 text-white hover:bg-white/10 hover:border-white/50"
            >
              <Link href="/services">
                Explore Services <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10"
            >
              <Link href="/condition-report">
                <Scan className="w-4 h-4" />
                Condition Report
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
