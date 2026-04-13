import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Scan, Shield, Zap, FileText, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConditionReportForm } from "@/components/preview/condition-report-form";
import { absoluteUrl, buildTitle, buildDescription } from "@/lib/seo";

export const metadata: Metadata = {
  title: buildTitle("Boat Condition Report"),
  description: buildDescription(
    "Upload a photo of your boat and get a condition assessment. Understand your boat's oxidation, gloss, and cleanliness levels with expert recommendations."
  ),
  alternates: {
    canonical: absoluteUrl("/condition-report"),
  },
};

const benefits = [
  {
    icon: Scan,
    title: "Comprehensive Assessment",
    description: "Snap a photo and get a real read on your boat's oxidation, gloss, and overall condition.",
  },
  {
    icon: FileText,
    title: "Downloadable Report",
    description: "Save or share your condition report - a handy record of where your boat stands before and after.",
  },
  {
    icon: Shield,
    title: "Honest Guidance",
    description: "Clear, straightforward results that tell you what's going on with your boat - no jargon.",
  },
  {
    icon: Zap,
    title: "Instant Results",
    description: "No waiting around. Your condition report is ready in seconds.",
  },
];

export default function ConditionReportPage() {
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
              <Scan className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Condition Analysis</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight">
              Boat Condition Report
            </h1>
            <p className="mt-6 text-lg text-white/70 leading-relaxed">
              Upload a photo of your boat and get a clear condition assessment. Understand your
              vessel&apos;s surface condition, identify likely issues, and receive expert service
              recommendations — all in under a minute.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-neutral-950 py-10 md:py-12 border-y border-white/10">
        <div className="page-shell">
          <div className="max-w-5xl mx-auto text-center">
            <p className="text-sm md:text-base font-semibold tracking-[0.18em] text-white/90 uppercase">
              500+ Boats Detailed · 5+ Years Experience · 5.0 Google Rating · Georgian Bay | Lake Simcoe | Muskoka
            </p>
            <p className="mt-4 text-base md:text-lg text-white/65">
              Five years. Five stars. Five hundred boats and counting.
              <br className="hidden md:block" />
              We come to you, and we don&apos;t leave until it&apos;s right.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-black py-16 md:py-24">
        <div className="page-shell">
          <ConditionReportForm />
        </div>
      </section>

      <section className="bg-neutral-950 py-16 md:py-20">
        <div className="page-shell">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((item) => (
              <div key={item.title} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-white/60">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-surface-ocean">
        <div className="page-shell text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Ready for a Full Assessment?
          </h2>
          <p className="mt-4 text-white/60 max-w-lg mx-auto">
            The condition report is a great starting point. Book a service for a definitive evaluation
            and professional treatment.
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
              <Link href="/preview">
                Try Visual Preview <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
