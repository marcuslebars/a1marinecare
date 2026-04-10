import type { Metadata } from "next";
import { Suspense } from "react";

import { BookingFlow } from "@/components/booking/booking-flow";
import { absoluteUrl, buildDescription, buildTitle } from "@/lib/seo";

export const metadata: Metadata = {
  title: buildTitle("Booking System"),
  description: buildDescription("Select a date, time, service, and location for your marine detailing appointment."),
  alternates: {
    canonical: absoluteUrl("/booking"),
  },
};

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="section-space"><div className="page-shell max-w-3xl"><div className="surface-panel p-6 md:p-8 text-center text-muted-foreground">Loading...</div></div></div>}>
      <BookingFlow />
    </Suspense>
  );
}
