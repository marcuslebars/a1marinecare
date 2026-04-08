import type { Metadata } from "next";

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
  return <BookingFlow />;
}
