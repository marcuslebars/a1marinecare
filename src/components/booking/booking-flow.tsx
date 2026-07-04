"use client";

import { format } from "date-fns";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Loader2, MapPin, Pencil, Ship, Sparkles } from "lucide-react";
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
import { getRecurringServiceRate, getRecurringServiceTypeBySlug, getServiceSlugByName, isRecurringServiceSlug, locations, services, slugToServiceName } from "@/content/site";
import type { BookingFormData } from "@/types/lead";

interface QuoteData {
  boatLength: string;
  boatType: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  locationSlug: string;
  serviceSlugs: string[];
  serviceNames: string[];
  estimatedTotal: number;
}

type BookingSource = "quote" | "direct";

const initialData: BookingFormData = {
  serviceSlug: services[0]?.slug ?? "",
  locationSlug: locations[0]?.slug ?? "",
  date: "",
  timeSlot: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  notes: "",
  boatLength: "",
  recurrenceType: null,
  bookingMode: "one-time",
  estimatedRecurringRate: undefined,
  serviceDisplayName: undefined,
  quotedServices: [],
  metadata: undefined,
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
  const [bookingSource, setBookingSource] = useState<BookingSource>("direct");
  const [editServicesFromQuote, setEditServicesFromQuote] = useState(false);

  const recurringServiceSlug = useMemo(() => {
    if (quoteData?.serviceSlugs?.length) {
      return quoteData.serviceSlugs.find((slug) => isRecurringServiceSlug(slug)) ?? null;
    }
    return isRecurringServiceSlug(data.serviceSlug) ? data.serviceSlug : null;
  }, [quoteData, data.serviceSlug]);

  const recurrenceType = useMemo(() => {
    return recurringServiceSlug ? getRecurringServiceTypeBySlug(recurringServiceSlug) : null;
  }, [recurringServiceSlug]);

  const recurringRatePerFoot = useMemo(() => {
    return recurringServiceSlug ? getRecurringServiceRate(recurringServiceSlug) : null;
  }, [recurringServiceSlug]);

  const resolvedBoatLength = quoteData?.boatLength || data.boatLength || "";
  const recurringRate = recurrenceType && recurringRatePerFoot && resolvedBoatLength
    ? Number(resolvedBoatLength) * recurringRatePerFoot
    : null;
  const isRecurringBooking = Boolean(recurrenceType);

  const loadQuote = useCallback(async (id: string) => {
    setIsLoadingQuote(true);
    setQuoteError(null);
    console.log("[Booking Load] quoteId:", id);
    try {
      const response = await fetch(`/api/quotes/${id}`);
      console.log("[Booking Load] response status:", response.status, "| quoteId:", id);
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
      console.log("[Booking Load] quote payload:", JSON.stringify({
        boatLength: quote.boatLength,
        boatType: quote.boatType,
        services: quote.services,
        locationSlug: quote.locationSlug,
        contactName: quote.contactName,
        estimatedTotal: quote.estimatedTotal,
      }));

      const serviceNames: string[] = quote.services || [];
      const serviceSlugs: string[] = serviceNames
        .map((name) => getServiceSlugByName(name))
        .filter((slug): slug is string => slug !== null);

      const recurringQuoteServiceSlug = serviceSlugs.find((slug) => isRecurringServiceSlug(slug)) || null;
      const primaryServiceSlug = recurringQuoteServiceSlug || serviceSlugs[0] || services[0]?.slug || "";

      console.log("[Booking Init] prefilled services:", {
        serviceNames,
        serviceSlugs,
        primaryServiceSlug,
        quoteHasServices: serviceSlugs.length > 0,
      });

      setBookingSource("quote");
      setQuoteData({
        boatLength: quote.boatLength,
        boatType: quote.boatType,
        contactName: quote.contactName,
        contactEmail: quote.contactEmail,
        contactPhone: quote.contactPhone,
        locationSlug: quote.locationSlug,
        serviceSlugs,
        serviceNames,
        estimatedTotal: quote.estimatedTotal || 0,
      });

      const recurrenceType = recurringQuoteServiceSlug ? getRecurringServiceTypeBySlug(recurringQuoteServiceSlug) : null;
      const recurringRatePerFoot = recurringQuoteServiceSlug ? getRecurringServiceRate(recurringQuoteServiceSlug) : null;
      const quoteBoatLength = quote.boatLength || "";

      setData((prev) => ({
        ...prev,
        serviceSlug: primaryServiceSlug,
        serviceDisplayName: slugToServiceName[primaryServiceSlug] || serviceNames[0] || prev.serviceDisplayName,
        quotedServices: serviceNames,
        contactName: quote.contactName || prev.contactName,
        contactEmail: quote.contactEmail || prev.contactEmail,
        contactPhone: quote.contactPhone || prev.contactPhone,
        locationSlug: quote.locationSlug || prev.locationSlug,
        notes: quote.notes || prev.notes,
        boatLength: quoteBoatLength || prev.boatLength,
        recurrenceType,
        bookingMode: recurrenceType ? "recurring" : "one-time",
        estimatedRecurringRate: recurrenceType && recurringRatePerFoot && quoteBoatLength
          ? Number(quoteBoatLength) * recurringRatePerFoot
          : prev.estimatedRecurringRate,
      }));

      if (serviceSlugs.length === 0) {
        console.log("[Booking Init] quote has no mappable services - will show service selector");
        setEditServicesFromQuote(true);
      }
    } catch (err) {
      console.error("[Booking Load] fetch error:", err);
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
    if (step === 1) {
      const needsBoatLength = bookingSource !== "quote" && isRecurringBooking;
      return Boolean(data.serviceSlug && data.locationSlug && (!needsBoatLength || data.boatLength));
    }
    if (step === 2) return Boolean(data.contactName && data.contactEmail && data.contactPhone);
    return true;
  }, [step, data, bookingSource, isRecurringBooking]);

  async function submitBooking() {
    setSubmissionState("submitting");

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          quoteId,
          boatLength: resolvedBoatLength || data.boatLength,
          recurrenceType,
          bookingMode: isRecurringBooking ? "recurring" : "one-time",
          estimatedRecurringRate: recurringRate ?? data.estimatedRecurringRate,
          serviceDisplayName: slugToServiceName[data.serviceSlug] || data.serviceDisplayName,
          quotedServices: quoteData?.serviceNames || data.quotedServices,
          metadata: {
            bookingSource,
            recurrenceType,
            quotedServices: quoteData?.serviceNames || data.quotedServices || [],
            estimatedRecurringRate: recurringRate ?? data.estimatedRecurringRate ?? null,
            boatLength: resolvedBoatLength || data.boatLength || null,
          },
        }),
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
                {quoteData.boatLength}ft {quoteData.boatType} &bull; {quoteData.serviceNames.length} service{quoteData.serviceNames.length !== 1 ? "s" : ""} selected
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
              <h2 className="text-2xl font-semibold">{isRecurringBooking ? "Select your start date and preferred time window" : "Select date and time"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{isRecurringBooking ? "We will anchor your recurring Maintenance Plan to this first visit and preferred time window." : "Choose an available appointment slot."}</p>
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
              <h2 className="text-2xl font-semibold">{isRecurringBooking ? "Recurring service confirmation" : "Service and location"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {bookingSource === "quote" && !editServicesFromQuote
                  ? isRecurringBooking
                    ? "Review your quoted Maintenance Plan and confirm the recurring booking details below."
                    : "Review your quoted services below."
                  : isRecurringBooking
                    ? "Choose your Maintenance Plan, confirm the boat length, and select the service location."
                    : "Choose the service type and your location."}
              </p>
              <div className="mt-5 space-y-4">
                {bookingSource === "quote" && !editServicesFromQuote && quoteData && quoteData.serviceNames.length > 0 ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-primary">Quoted Services</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {quoteData.serviceNames.length} service{quoteData.serviceNames.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {quoteData.serviceNames.map((name, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-primary" />
                            <span>{name}</span>
                          </div>
                        ))}
                      </div>
                      {quoteData.estimatedTotal > 0 && (
                        <div className="mt-3 pt-3 border-t border-primary/20">
                          <span className="text-sm font-medium text-primary">
                            Quote estimate: ${(quoteData.estimatedTotal / 100).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        console.log("[Booking Init] switching to manual service selection");
                        setEditServicesFromQuote(true);
                        setBookingSource("direct");
                      }}
                      className="gap-2"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit services
                    </Button>
                  </div>
                ) : (
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
                )}
                {isRecurringBooking && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
                    <p className="font-medium text-primary">Recurring Service Type</p>
                    <p className="mt-1 text-foreground">{recurrenceType === "weekly" ? "Weekly" : "Bi-Weekly"} Maintenance Plan</p>
                    <p className="mt-1 text-muted-foreground">Includes pressure wash, wipe down, chrome polish, and window cleaning on a recurring cadence.</p>
                    {recurringRate !== null && (
                      <p className="mt-2 text-foreground font-medium">Calculated recurring rate: ${recurringRate.toFixed(2)} per visit</p>
                    )}
                  </div>
                )}
                {bookingSource !== "quote" && isRecurringBooking && (
                  <div className="space-y-2">
                    <Label htmlFor="boatLength">Boat Length (ft)</Label>
                    <Input
                      id="boatLength"
                      type="number"
                      placeholder="30"
                      value={data.boatLength || ""}
                      onChange={(event) => setData((previous) => ({ ...previous, boatLength: event.target.value }))}
                      className="rounded-xl"
                    />
                  </div>
                )}
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
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{isRecurringBooking ? "Preferred Time Window" : "Time"}</p>
                    <p className="font-medium">{data.timeSlot}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Service</p>
                    <p className="font-medium">{services.find((s) => s.slug === data.serviceSlug)?.name}</p>
                  </div>
                  {isRecurringBooking && (
                    <>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Recurring Service Type</p>
                        <p className="font-medium">{recurrenceType === "weekly" ? "Weekly" : "Bi-Weekly"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Boat Length</p>
                        <p className="font-medium">{resolvedBoatLength ? `${resolvedBoatLength}ft` : "Pending"}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Location</p>
                    <p className="font-medium">{locations.find((l) => l.slug === data.locationSlug)?.name}</p>
                  </div>
                  {quoteData && quoteData.serviceNames.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Quoted Services</p>
                      <div className="mt-1 space-y-1">
                        {quoteData.serviceNames.map((name, index) => (
                          <p key={index} className="font-medium">{name}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  {quoteData && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Boat Details</p>
                      <p className="font-medium">{quoteData.boatLength}ft {quoteData.boatType}</p>
                    </div>
                  )}
                  {isRecurringBooking && recurringRate !== null && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Recurring Rate</p>
                      <p className="font-medium">${recurringRate.toFixed(2)} per visit</p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Contact</p>
                    <p className="font-medium">{data.contactName}</p>
                    <p className="text-muted-foreground text-xs">{data.contactEmail}</p>
                    <p className="text-muted-foreground text-xs">{data.contactPhone}</p>
                  </div>
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
                    isRecurringBooking ? "Confirm Recurring Plan" : "Confirm Booking"
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
