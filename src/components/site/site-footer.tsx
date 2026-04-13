// Style system: contemporary coastal modernism with a dark harbor footer, bright cyan accents, and restrained premium typography.
import Image from "next/image";
import Link from "next/link";

import { locations, services } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#03111c] text-white">
      <div className="page-shell grid gap-8 py-10 md:grid-cols-[1.35fr_1fr_1.15fr_1fr]">
        <div>
          <Link href="/" className="inline-flex items-center">
            <Image
              src="/images/logos/logo.png"
              alt="A1 Marine Care"
              width={400}
              height={100}
              className="h-10 w-auto object-contain"
            />
          </Link>
          <p className="mt-4 max-w-md text-sm text-slate-300">
            Premium mobile boat detailing for owners who expect flawless finish, long-term protection,
            and white-glove dockside service.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-slate-300">
            <span>Site by</span>
            <a
              href="https://ranklocal.ca"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center transition-opacity hover:opacity-90"
              aria-label="Site by Ranklocal"
            >
              <Image
                src="/images/logos/ranklocal.svg"
                alt="Ranklocal"
                width={700}
                height={200}
                className="h-6 w-auto object-contain"
              />
            </a>
          </div>
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
          <ul className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 text-sm text-slate-300">
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
