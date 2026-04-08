"use client";

import { format } from "date-fns";
import { ArrowLeft, ArrowRight, CalendarDays, Check } from "lucide-react";
import { useMemo, useState } from "react";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { timeSlots } from "@/content/booking";
import { locations, services } from "@/content/site";
import type { BookingFormData } from "@/types/lead";

const initialData: BookingFormData = {
  serviceSlug: services[0]?.slug ?? "",
  locationSlug: locations[0]?.slug ?? "",
  date: "",
  timeSlot: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  notes: "",
};

type SubmissionState = "idle" | "submitting" | "success" | "error";

export function BookingFlow() {
  const [step, setStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [data, setData] = useState<BookingFormData>(initialData);
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");

  const canContinue = useMemo(() => {
    if (step === 0) return Boolean(data.date && data.timeSlot);
    if (step === 1) return Boolean(data.serviceSlug && data.locationSlug);
    if (step === 2) return Boolean(data.contactName && data.contactEmail && data.contactPhone);
    return true;
  }, [step, data]);

  async function submitBooking() {
    setSubmissionState("submitting");

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to submit booking");
      }

      setSubmissionState("success");
    } catch {
      setSubmissionState("error");
    }
  }

  return (
    <section className="section-space">
      <div className="page-shell max-w-3xl">
        <div className="surface-panel p-6 md:p-8">
          <div className="mb-6 flex flex-wrap gap-2 text-xs text-muted-foreground md:text-sm">
            {[
              "Calendar",
              "Service",
              "Contact",
              "Summary",
            ].map((label, index) => (
              <span
                key={label}
                className={`rounded-full border px-3 py-1 ${index <= step ? "border-primary text-primary" : "border-border"}`}
              >
                {index + 1}. {label}
              </span>
            ))}
          </div>

          {step === 0 ? (
            <div>
              <h2 className="text-2xl font-semibold">Select date and time</h2>
              <p className="mt-1 text-sm text-muted-foreground">Choose an available appointment slot.</p>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div className="rounded-xl border border-border p-3">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setData((previous) => ({
                        ...previous,
                        date: date ? format(date, "yyyy-MM-dd") : "",
                      }));
                    }}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </div>
                <div>
                  <p className="mb-3 inline-flex items-center gap-2 text-sm font-medium">
                    <CalendarDays className="h-4 w-4" /> Time slots
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setData((previous) => ({ ...previous, timeSlot: slot }))}
                        className={`rounded-xl border p-3 text-sm ${
                          data.timeSlot === slot ? "border-primary bg-secondary" : "border-border"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div>
              <h2 className="text-2xl font-semibold">Service and location</h2>
              <p className="mt-1 text-sm text-muted-foreground">Choose the type of booking request.</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <select
                  className="rounded-xl border border-border p-3 text-sm"
                  value={data.serviceSlug}
                  onChange={(event) => setData((previous) => ({ ...previous, serviceSlug: event.target.value }))}
                >
                  {services.map((service) => (
                    <option key={service.slug} value={service.slug}>
                      {service.name}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-xl border border-border p-3 text-sm"
                  value={data.locationSlug}
                  onChange={(event) => setData((previous) => ({ ...previous, locationSlug: event.target.value }))}
                >
                  {locations.map((location) => (
                    <option key={location.slug} value={location.slug}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <h2 className="text-2xl font-semibold">Contact confirmation</h2>
              <p className="mt-1 text-sm text-muted-foreground">Provide booking contact details.</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <input
                  className="rounded-xl border border-border p-3 text-sm"
                  placeholder="Full name"
                  value={data.contactName}
                  onChange={(event) => setData((previous) => ({ ...previous, contactName: event.target.value }))}
                />
                <input
                  className="rounded-xl border border-border p-3 text-sm"
                  placeholder="Email"
                  value={data.contactEmail}
                  onChange={(event) => setData((previous) => ({ ...previous, contactEmail: event.target.value }))}
                />
                <input
                  className="rounded-xl border border-border p-3 text-sm"
                  placeholder="Phone"
                  value={data.contactPhone}
                  onChange={(event) => setData((previous) => ({ ...previous, contactPhone: event.target.value }))}
                />
              </div>
              <textarea
                className="mt-4 min-h-28 w-full rounded-xl border border-border p-3 text-sm"
                placeholder="Access notes"
                value={data.notes}
                onChange={(event) => setData((previous) => ({ ...previous, notes: event.target.value }))}
              />
            </div>
          ) : null}

          {step === 3 ? (
            <div>
              <h2 className="text-2xl font-semibold">Booking summary</h2>
              <div className="mt-5 space-y-2 text-sm">
                <p>
                  <span className="font-medium">Date:</span> {data.date}
                </p>
                <p>
                  <span className="font-medium">Time:</span> {data.timeSlot}
                </p>
                <p>
                  <span className="font-medium">Service:</span> {services.find((item) => item.slug === data.serviceSlug)?.name}
                </p>
                <p>
                  <span className="font-medium">Location:</span> {locations.find((item) => item.slug === data.locationSlug)?.name}
                </p>
                <p>
                  <span className="font-medium">Contact:</span> {data.contactName} ({data.contactEmail})
                </p>
              </div>

              <Button
                className="mt-6"
                onClick={submitBooking}
                disabled={submissionState === "submitting" || submissionState === "success"}
              >
                {submissionState === "submitting" ? "Submitting..." : "Confirm Booking"}
              </Button>

              {submissionState === "success" ? (
                <p className="mt-3 inline-flex items-center gap-2 text-sm text-primary">
                  <Check className="h-4 w-4" /> Booking submitted successfully.
                </p>
              ) : null}

              {submissionState === "error" ? (
                <p className="mt-3 text-sm text-destructive">Booking submission failed. Please try again.</p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-8 flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep((previous) => Math.max(0, previous - 1))} disabled={step === 0}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep((previous) => Math.min(3, previous + 1))} disabled={!canContinue}>
                Continue <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
