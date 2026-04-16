import { Metadata } from "next";
import Script from "next/script";

import "./globals.css";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { SchemaScript } from "@/components/site/schema-script";
import { company, locations } from "@/content/site";
import { localBusinessSchema } from "@/lib/schema";
import { absoluteUrl, defaultDescription, defaultTitle } from "@/lib/seo";

export const metadata: Metadata = {
  title: defaultTitle,
  description: defaultDescription,
  metadataBase: new URL(company.url),
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
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
      <body className="min-h-screen bg-background text-foreground flex flex-col">
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-XDHBCBCT9P" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-XDHBCBCT9P');
          `}
        </Script>
        <SchemaScript schema={businessSchema} />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
