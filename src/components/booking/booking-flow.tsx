"use client";

import { format } from "date-fns";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Loader2, MapPin, Ship } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
              { label: "Calendar", num: 1 },
              { label: "Service", num: 2 },
              { label: "Contact", num: 3 },
              { label: "Summary", num: 4 },
            ].map((item) => (
              <span
                key={item.label}
                className={`rounded-full border px-3 py-1 ${step + 1 >= item.num ? "border-primary text-primary" : "border-border"}`}
              >
                {item.num}. {item.label}
              </span>
            ))}
          </div>

          {step === 0 && (
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
                  <Label className="mb-3 inline-flex items-center gap-2 text-sm font-medium">
                    <CalendarDays className="h-4 w-4" /> Time slots
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setData((previous) => ({ ...previous, timeSlot: slot }))}
                        className={`rounded-xl border p-3 text-sm transition-colors ${
                          data.timeSlot === slot
                            ? "border-primary bg-secondary text-foreground"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-2xl font-semibold">Service and location</h2>
              <p className="mt-1 text-sm text-muted-foreground">Choose the service type and your location.</p>
              <div className="mt-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="service">Service</Label>
                  <Select
                    value={data.serviceSlug}
                    onValueChange={(value) => setData((previous) => ({ ...previous, serviceSlug: value }))}
                  >
                    <SelectTrigger id="service" className="rounded-xl">
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.slug} value={service.slug}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Location
                  </Label>
                  <Select
                    value={data.locationSlug}
                    onValueChange={(value) => setData((previous) => ({ ...previous, locationSlug: value }))}
                  >
                    <SelectTrigger id="location" className="rounded-xl">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.slug} value={location.slug}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-semibold">Contact confirmation</h2>
              <p className="mt-1 text-sm text-muted-foreground">Provide booking contact details.</p>
              <div className="mt-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Full Name</Label>
                  <Input
                    id="contactName"
                    placeholder="Jane Smith"
                    value={data.contactName}
                    onChange={(event) => setData((previous) => ({ ...previous, contactName: event.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      placeholder="jane@example.com"
                      value={data.contactEmail}
                      onChange={(event) => setData((previous) => ({ ...previous, contactEmail: event.target.value }))}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Phone</Label>
                    <Input
                      id="contactPhone"
                      type="tel"
                      placeholder="(705) 996-1010"
                      value={data.contactPhone}
                      onChange={(event) => setData((previous) => ({ ...previous, contactPhone: event.target.value }))}
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Access Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Marina name, slip number, access instructions..."
                    value={data.notes}
                    onChange={(event) => setData((previous) => ({ ...previous, notes: event.target.value }))}
                    className="rounded-xl min-h-[80px]"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-2xl font-semibold">Booking summary</h2>
              <div className="mt-5 space-y-3 rounded-xl border border-border p-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Date</p>
                    <p className="font-medium">{data.date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Time</p>
                    <p className="font-medium">{data.timeSlot}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Service</p>
                    <p className="font-medium">{services.find((s) => s.slug === data.serviceSlug)?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Location</p>
                    <p className="font-medium">{locations.find((l) => l.slug === data.locationSlug)?.name}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Contact</p>
                    <p className="font-medium">{data.contactName}</p>
                    <p className="text-muted-foreground text-xs">{data.contactEmail}</p>
                    <p className="text-muted-foreground text-xs">{data.contactPhone}</p>
                  </div>
                  {quoteData && quoteData.services.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Quote Services</p>
                      <p className="font-medium">{quoteData.services.join(", ")}</p>
                    </div>
                  )}
                  {data.notes && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Notes</p>
                      <p className="text-muted-foreground text-xs">{data.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={submitBooking}
                  disabled={submissionState === "submitting" || submissionState === "success"}
                >
                  {submissionState === "submitting" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : submissionState === "success" ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Booking Confirmed
                    </>
                  ) : (
                    "Confirm Booking"
                  )}
                </Button>

                {submissionState === "success" && (
                  <p className="text-center text-sm text-primary">
                    Your booking request has been submitted. We will contact you shortly to confirm.
                  </p>
                )}

                {submissionState === "error" && (
                  <p className="text-center text-sm text-destructive">
                    Booking submission failed. Please try again or contact us directly.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
            <Button
              variant="outline"
              onClick={() => setStep((previous) => Math.max(0, previous - 1))}
              disabled={step === 0}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep((previous) => Math.min(3, previous + 1))} disabled={!canContinue} className="gap-2">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
