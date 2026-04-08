import type { Metadata } from "next";
import Link from "next/link";

import { isDashboardAuthenticated } from "@/lib/auth";
import { absoluteUrl, buildDescription, buildTitle } from "@/lib/seo";

export const metadata: Metadata = {
  title: buildTitle("Internal App"),
  description: buildDescription("Protected entry point for the future internal dashboard, job tracking, and CRM replacement."),
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
          <h1 className="mt-2 text-3xl font-semibold">Internal platform scaffold</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This route is reserved for the future internal dashboard, job workflow tracker, and CRM replacement modules.
          </p>

          {authenticated ? (
            <p className="mt-6 rounded-xl border border-primary/30 bg-secondary p-4 text-sm text-primary">
              Dashboard session detected. Internal modules can be mounted here.
            </p>
          ) : (
            <p className="mt-6 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              Access denied. No internal session cookie is set.
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
