import type { Metadata } from "next";

import { ContactPageContent } from "@/components/contact/contact-page-content";
import { absoluteUrl, buildDescription, buildTitle } from "@/lib/seo";

export const metadata: Metadata = {
  title: buildTitle("Contact Us"),
  description: buildDescription(
    "Questions about detailing, restoration, coatings, or booking? Contact A1 Marine Care and we will help you choose the right service for your boat.",
  ),
  alternates: {
    canonical: absoluteUrl("/contact"),
  },
};

export default function ContactPage() {
  return <ContactPageContent />;
}
