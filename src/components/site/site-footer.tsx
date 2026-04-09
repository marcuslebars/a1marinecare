// Style system: contemporary coastal modernism with a dark harbor footer, bright cyan accents, and restrained premium typography.
import Image from "next/image";
import Link from "next/link";

import { locations, services } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#03111c] text-white">
      <div className="page-shell grid gap-10 py-12 md:grid-cols-4">
        <div>
          <Link href="/" className="inline-flex items-center">
            <Image
              src="/images/logos/a1-marine-care-logo-white.png"
              alt="A1 Marine Care"
              width={400}
              height={100}
              className="h-10 w-auto object-contain"
            />
          </Link>
          <p className="mt-4 text-sm text-slate-300">
            Premium mobile boat detailing for owners who expect flawless finish, long-term protection, and white-glove dockside service.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-white">Services</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
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
          <p className="text-sm font-semibold text-white">Locations</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
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
          <p className="text-sm font-semibold text-white">Book With Us</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>
              <Link href="/quote" className="transition-colors hover:text-primary">
                Request a Quote
              </Link>
            </li>
            <li>
              <Link href="/booking" className="transition-colors hover:text-primary">
                Reserve a Service Date
              </Link>
            </li>
            <li>
              <Link href="/app" className="transition-colors hover:text-primary">
                Client Care
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
