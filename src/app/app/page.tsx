import type { Metadata } from "next";
import Link from "next/link";

import { isDashboardAuthenticated } from "@/lib/auth";
import { absoluteUrl, buildDescription, buildTitle } from "@/lib/seo";

export const metadata: Metadata = {
  title: buildTitle("Client Care"),
  description: buildDescription("Private client care access for active marine detailing customers."),
  alternates: {
    canonical: absoluteUrl("/app"),
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function InternalAppPage() {
  const authenticated = await isDashboardAuthenticated();

  return (
    <section className="section-space">
      <div className="page-shell max-w-3xl">
        <div className="surface-panel p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">Protected Route</p>
          <h1 className="mt-2 text-3xl font-semibold">Private client care</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This private area is reserved for active clients and service follow-up.
          </p>

          {authenticated ? (
            <p className="mt-6 rounded-xl border border-primary/30 bg-secondary p-4 text-sm text-primary">
              Session confirmed. Your private client area is available.
            </p>
          ) : (
            <p className="mt-6 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              Access restricted. No client session was detected.
            </p>
          )}

          <div className="mt-6">
            <Link href="/" className="text-sm font-medium text-primary underline-offset-2 hover:underline">
              Return to public site
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
