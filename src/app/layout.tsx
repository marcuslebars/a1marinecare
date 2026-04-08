import type { Metadata } from "next";

import "./globals.css";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { company, locations } from "@/content/site";
import { absoluteUrl, defaultDescription, defaultTitle } from "@/lib/seo";
import { localBusinessSchema } from "@/lib/schema";
import { SchemaScript } from "@/components/site/schema-script";

export const metadata: Metadata = {
  title: defaultTitle,
  description: defaultDescription,
  metadataBase: new URL(company.url),
  openGraph: {
    title: defaultTitle,
    description: defaultDescription,
    url: absoluteUrl("/"),
    siteName: company.name,
    locale: "en_CA",
    type: "website",
  },
  alternates: {
    canonical: absoluteUrl("/"),
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const businessSchema = localBusinessSchema(locations.map((location) => `${location.name}, ${location.region}`));

  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        <SchemaScript schema={businessSchema} />
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
