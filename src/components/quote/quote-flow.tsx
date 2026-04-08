"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { addonOptions, boatLengths, boatTypes } from "@/content/quote";
import { locations, services } from "@/content/site";
import type { QuoteFormData } from "@/types/lead";

const steps = [
  "Boat length",
  "Boat type",
  "Services",
  "Add-ons",
  "Contact",
  "Summary",
] as const;

const initialData: QuoteFormData = {
  boatLength: "",
  boatType: "",
  services: [],
  addons: [],
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  notes: "",
  locationSlug: locations[0]?.slug ?? "",
};

type SubmissionState = "idle" | "submitting" | "success" | "error";

export function QuoteFlow() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<QuoteFormData>(initialData);
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");

  const canContinue = useMemo(() => {
    if (step === 0) return data.boatLength.length > 0;
    if (step === 1) return data.boatType.length > 0;
    if (step === 2) return data.services.length > 0;
    if (step === 3) return true;
    if (step === 4) return Boolean(data.contactName && data.contactEmail && data.contactPhone);
    return true;
  }, [step, data]);

  async function submitQuote() {
    setSubmissionState("submitting");

    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to submit quote");
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
          <div className="mb-8 flex items-center justify-between">
            {steps.map((label, index) => (
              <div key={label} className="flex items-center gap-2 text-xs md:text-sm">
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full border ${
                    index <= step ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
                  }`}
                >
                  {index + 1}
                </span>
                <span className={index <= step ? "text-foreground" : "text-muted-foreground"}>{label}</span>
              </div>
            ))}
          </div>

          <div key={step} className="animate-in fade-in slide-in-from-right-2 duration-200">
              {step === 0 ? (
                <div>
                  <h2 className="text-2xl font-semibold">Boat length</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Select the vessel size to estimate labor and materials.</p>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {boatLengths.map((length) => (
                      <button
                        key={length}
                        type="button"
                        onClick={() => setData((previous) => ({ ...previous, boatLength: length }))}
                        className={`rounded-xl border p-3 text-left text-sm ${
                          data.boatLength === length ? "border-primary bg-secondary" : "border-border"
                        }`}
                      >
                        {length}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {step === 1 ? (
                <div>
                  <h2 className="text-2xl font-semibold">Boat type</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Choose your vessel category.</p>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {boatTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setData((previous) => ({ ...previous, boatType: type }))}
                        className={`rounded-xl border p-3 text-left text-sm ${
                          data.boatType === type ? "border-primary bg-secondary" : "border-border"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div>
                  <h2 className="text-2xl font-semibold">Service selection</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Select one or more services.</p>
                  <div className="mt-5 space-y-3">
                    {services.map((service) => {
                      const selected = data.services.includes(service.slug);

                      return (
                        <button
                          key={service.slug}
                          type="button"
                          onClick={() =>
                            setData((previous) => ({
                              ...previous,
                              services: selected
                                ? previous.services.filter((slug) => slug !== service.slug)
                                : [...previous.services, service.slug],
                            }))
                          }
                          className={`w-full rounded-xl border p-4 text-left ${
                            selected ? "border-primary bg-secondary" : "border-border"
                          }`}
                        >
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm text-muted-foreground">{service.shortDescription}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {step === 3 ? (
                <div>
                  <h2 className="text-2xl font-semibold">Add-ons</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Optional extras for your service package.</p>
                  <div className="mt-5 space-y-3">
                    {addonOptions.map((addon) => {
                      const selected = data.addons.includes(addon);

                      return (
                        <button
                          key={addon}
                          type="button"
                          onClick={() =>
                            setData((previous) => ({
                              ...previous,
                              addons: selected
                                ? previous.addons.filter((item) => item !== addon)
                                : [...previous.addons, addon],
                            }))
                          }
                          className={`w-full rounded-xl border p-4 text-left text-sm ${
                            selected ? "border-primary bg-secondary" : "border-border"
                          }`}
                        >
                          {addon}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {step === 4 ? (
                <div>
                  <h2 className="text-2xl font-semibold">Contact details</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Where should we send your quote?</p>
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
                  <textarea
                    className="mt-4 min-h-28 w-full rounded-xl border border-border p-3 text-sm"
                    placeholder="Boat condition notes"
                    value={data.notes}
                    onChange={(event) => setData((previous) => ({ ...previous, notes: event.target.value }))}
                  />
                </div>
              ) : null}

              {step === 5 ? (
                <div>
                  <h2 className="text-2xl font-semibold">Summary</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Review before submitting.</p>
                  <div className="mt-5 space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Boat:</span> {data.boatLength} / {data.boatType}
                    </p>
                    <p>
                      <span className="font-medium">Services:</span> {data.services.join(", ")}
                    </p>
                    <p>
                      <span className="font-medium">Add-ons:</span> {data.addons.length ? data.addons.join(", ") : "None"}
                    </p>
                    <p>
                      <span className="font-medium">Contact:</span> {data.contactName} ({data.contactEmail})
                    </p>
                  </div>

                  <Button
                    className="mt-6"
                    onClick={submitQuote}
                    disabled={submissionState === "submitting" || submissionState === "success"}
                  >
                    {submissionState === "submitting" ? "Submitting..." : "Submit Quote"}
                  </Button>

                  {submissionState === "success" ? (
                    <p className="mt-3 inline-flex items-center gap-2 text-sm text-primary">
                      <Check className="h-4 w-4" /> Quote submitted successfully.
                    </p>
                  ) : null}

                  {submissionState === "error" ? (
                    <p className="mt-3 text-sm text-destructive">Quote submission failed. Please try again.</p>
                  ) : null}
                </div>
              ) : null}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep((previous) => Math.max(0, previous - 1))} disabled={step === 0}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep((previous) => Math.min(steps.length - 1, previous + 1))} disabled={!canContinue}>
                Continue <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
