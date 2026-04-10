"use client";

import { format } from "date-fns";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Loader2, Ship } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { timeSlots } from "@/content/booking";
import { locations, services } from "@/content/site";
import type { BookingFormData } from "@/types/lead";

interface QuoteData {
  boatLength: string;
  boatType: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  locationSlug: string;
  services: string[];
  estimatedTotal: number;
}

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
  const searchParams = useSearchParams();
  const quoteId = searchParams?.get("quoteId") ?? null;

  const [step, setStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [data, setData] = useState<BookingFormData>(initialData);
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);

  const loadQuote = useCallback(async (id: string) => {
    setIsLoadingQuote(true);
    setQuoteError(null);
    try {
      const response = await fetch(`/api/quotes/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          setQuoteError("Quote not found. Please start a new booking.");
        } else {
          setQuoteError("Failed to load quote. Please start a new booking.");
        }
        return;
      }
      const result = await response.json();
      const quote = result.quote;

      setQuoteData({
        boatLength: quote.boatLength,
        boatType: quote.boatType,
        contactName: quote.contactName,
        contactEmail: quote.contactEmail,
        contactPhone: quote.contactPhone,
        locationSlug: quote.locationSlug,
        services: quote.services || [],
        estimatedTotal: quote.estimatedTotal || 0,
      });

      setData((prev) => ({
        ...prev,
        contactName: quote.contactName || prev.contactName,
        contactEmail: quote.contactEmail || prev.contactEmail,
        contactPhone: quote.contactPhone || prev.contactPhone,
        locationSlug: quote.locationSlug || prev.locationSlug,
        notes: quote.notes || prev.notes,
      }));
    } catch {
      setQuoteError("Failed to load quote. Please start a new booking.");
    } finally {
      setIsLoadingQuote(false);
    }
  }, []);

  useEffect(() => {
    if (quoteId) {
      loadQuote(quoteId);
    }
  }, [quoteId, loadQuote]);

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
        body: JSON.stringify({ ...data, quoteId }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit booking");
      }

      setSubmissionState("success");
    } catch {
      setSubmissionState("error");
    }
  }

  if (isLoadingQuote) {
    return (
      <section className="section-space">
        <div className="page-shell max-w-3xl">
          <div className="surface-panel flex items-center justify-center p-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="mt-4 text-muted-foreground">Loading your quote...</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (quoteError) {
    return (
      <section className="section-space">
        <div className="page-shell max-w-3xl">
          <div className="surface-panel p-6 md:p-8">
            <div className="text-center">
              <p className="text-destructive">{quoteError}</p>
              <Button asChild className="mt-4">
                <a href="/quote">Get a Quote</a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section-space">
      <div className="page-shell max-w-3xl">
        <div className="surface-panel p-6 md:p-8">
          {quoteData && (
            <div className="mb-6 rounded-xl bg-primary/5 border border-primary/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Ship className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Continuing from Quote</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {quoteData.boatLength}ft {quoteData.boatType} &bull; {quoteData.services.length} service{quoteData.services.length !== 1 ? "s" : ""} selected
                {quoteData.estimatedTotal > 0 && (
                  <span className="ml-2 font-medium text-foreground">
                    ${(quoteData.estimatedTotal / 100).toFixed(2)} estimate
                  </span>
                )}
              </p>
            </div>
          )}

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
                {quoteData && quoteData.services.length > 0 && (
                  <p>
                    <span className="font-medium">Quote Services:</span> {quoteData.services.join(", ")}
                  </p>
                )}
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
