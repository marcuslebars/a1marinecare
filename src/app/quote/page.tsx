import type { Metadata } from "next";

import { QuoteFlow } from "@/components/quote/quote-flow";
import { absoluteUrl, buildDescription, buildTitle } from "@/lib/seo";

export const metadata: Metadata = {
  title: buildTitle("Quote Application"),
  description: buildDescription("Build a custom quote request in six steps for your boat and service needs."),
  alternates: {
    canonical: absoluteUrl("/quote"),
  },
};

export default function QuotePage() {
  return <QuoteFlow />;
}
