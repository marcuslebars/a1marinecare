import { Metadata } from "next";
import Script from "next/script";

import "./globals.css";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { SchemaScript } from "@/components/site/schema-script";
import { MetaPixel } from "@/components/site/meta-pixel";
import { SeasonalBanner } from "@/components/site/seasonal-banner";
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
      <head>
        <script async defer src="https://tools.luckyorange.com/core/lo.js?site-id=fa8ac7ac"></script>
        <script
          {...({
            nowprocket: "",
            "nitro-exclude": "",
            type: "text/javascript",
            id: "sa-dynamic-optimization",
            "data-uuid": "610c7074-31c7-44df-b459-2ccb0f4daf5e",
            src: "data:text/javascript;base64,dmFyIHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoInNjcmlwdCIpO3NjcmlwdC5zZXRBdHRyaWJ1dGUoIm5vd3Byb2NrZXQiLCAiIik7c2NyaXB0LnNldEF0dHJpYnV0ZSgibml0cm8tZXhjbHVkZSIsICIiKTtzY3JpcHQuc3JjID0gImh0dHBzOi8vZGFzaGJvYXJkLnNlYXJjaGF0bGFzLmNvbS9zY3JpcHRzL2R5bmFtaWNfb3B0aW1pemF0aW9uLmpzIjtzY3JpcHQuZGF0YXNldC51dWlkID0gIjYxMGM3MDc0LTMxYzctNDRkZi1iNDU5LTJjY2IwZjRkYWY1ZSI7c2NyaXB0LmlkID0gInNhLWR5bmFtaWMtb3B0aW1pemF0aW9uLWxvYWRlciI7ZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzY3JpcHQpOw==",
          } as Record<string, string>)}
        ></script>
      </head>
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
        <MetaPixel />
        <SeasonalBanner />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
