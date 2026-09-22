import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { SHRINK_WRAP_PRICE_LABEL } from "@/lib/shrink-wrap-pricing";

/**
 * Site-wide seasonal strip for the fall shrink-wrap push. Remove (or gate on a
 * date) once the wrap season closes — it's a single line in layout.tsx.
 */
export function SeasonalBanner() {
  return (
    <div className="border-b border-primary/20 bg-[#03111c] text-white">
      <Link
        href="/shrink-wrapping?utm_source=site&utm_medium=banner&utm_campaign=shrink-wrap-fall"
        className="page-shell flex min-h-10 items-center justify-center gap-2 py-2 text-center text-xs font-medium sm:text-sm"
      >
        <span className="hidden rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary sm:inline">
          Now booking
        </span>
        <span>
          Mobile shrink wrap — we come to your driveway or dock. <span className="text-primary">{SHRINK_WRAP_PRICE_LABEL}</span>
        </span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary" />
      </Link>
    </div>
  );
}
