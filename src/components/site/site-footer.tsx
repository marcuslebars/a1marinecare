import Link from "next/link";

import { locations, services } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-secondary/40">
      <div className="page-shell grid gap-10 py-12 md:grid-cols-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.1em] text-primary">A1 Marine Care</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Mobile marine detailing, coating, and restoration services across Ontario waterfront communities.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold">Services</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {services.map((service) => (
              <li key={service.slug}>
                <Link href={`/services/${service.slug}`} className="transition-colors hover:text-primary">
                  {service.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold">Locations</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {locations.map((location) => (
              <li key={location.slug}>
                <Link href={`/locations/${location.slug}`} className="transition-colors hover:text-primary">
                  {location.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold">Platform</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/quote" className="transition-colors hover:text-primary">
                Quote Application
              </Link>
            </li>
            <li>
              <Link href="/booking" className="transition-colors hover:text-primary">
                Booking System
              </Link>
            </li>
            <li>
              <Link href="/app" className="transition-colors hover:text-primary">
                Internal App
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
