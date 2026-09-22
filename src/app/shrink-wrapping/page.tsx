import type { Metadata } from "next";

import { ShrinkWrapLanding } from "@/components/shrink-wrap/shrink-wrap-landing";
import { absoluteUrl } from "@/lib/seo";
import { formatCents, SHRINK_WRAP } from "@/lib/shrink-wrap-pricing";

const title = "Mobile Boat Shrink Wrapping — We Come To You | A1 Marine Care";
const description = `Boat shrink wrap at your driveway, dock, or marina across Georgian Bay, Lake Simcoe & Muskoka. ${formatCents(SHRINK_WRAP.rateCents)}/ft, ${formatCents(SHRINK_WRAP.minimumCents)} minimum. Optional winterization in the same visit. Instant online quote.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: absoluteUrl("/shrink-wrapping") },
  openGraph: {
    title,
    description,
    url: absoluteUrl("/shrink-wrapping"),
    type: "website",
    images: [{ url: absoluteUrl("/images/services/shrink-wrapping.jpg"), width: 768, height: 796, alt: "Boat shrink wrapping by A1 Marine Care" }],
  },
  twitter: { card: "summary_large_image", title, description },
};

export default function ShrinkWrappingPage() {
  return <ShrinkWrapLanding />;
}
