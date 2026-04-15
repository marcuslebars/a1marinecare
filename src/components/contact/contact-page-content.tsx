"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  LifeBuoy,
  Mail,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { company, locations, services } from "@/content/site";

type ContactFormData = {
  fullName: string;
  email: string;
  phone: string;
  subject: string;
  serviceInterest: string;
  message: string;
  source: string;
};

type ContactFormErrors = Partial<Record<keyof ContactFormData, string>>;

const INITIAL_FORM: ContactFormData = {
  fullName: "",
  email: "",
  phone: "",
  subject: "",
  serviceInterest: "general-inquiry",
  message: "",
  source: "contact-page",
};

const featuredRegions = ["Georgian Bay", "Muskoka", "Lake Simcoe", "Midland", "Barrie", "Orillia"];

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function ContactPageContent() {
  const [formData, setFormData] = useState<ContactFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const regionList = useMemo(() => {
    return locations
      .filter((location) => featuredRegions.includes(location.name))
      .map((location) => location.name)
      .join(" • ");
  }, []);

  function updateField<Key extends keyof ContactFormData>(key: Key, value: ContactFormData[Key]) {
    setFormData((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
    setSubmitError("");
  }

  function validateForm() {
    const nextErrors: ContactFormErrors = {};

    if (formData.fullName.trim().length < 2) nextErrors.fullName = "Please enter your full name.";
    if (!isValidEmail(formData.email.trim())) nextErrors.email = "Please enter a valid email address.";
    if (formData.phone.trim().length < 7) nextErrors.phone = "Please enter a valid phone number.";
    if (formData.subject.trim().length < 3) nextErrors.subject = "Please add a short subject line.";
    if (formData.message.trim().length < 10) nextErrors.message = "Please share a few details so we can help properly.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to send your message right now.");
      }

      setSubmitSuccess(true);
      setFormData(INITIAL_FORM);
      setErrors({});
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to send your message right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <section className="relative overflow-hidden bg-black py-24 md:py-32">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,229,255,0.16),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(0,229,255,0.08),_transparent_28%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.78)_0%,rgba(0,0,0,0.92)_58%,rgba(0,0,0,1)_100%)]" />
        </div>

        <div className="page-shell relative z-10">
          <div className="max-w-4xl">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary/80">A1 Marine Care</p>
            <h1 className="mt-5 text-5xl font-black tracking-tight text-white md:text-7xl">Contact Us</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/72 md:text-xl md:leading-9">
              Questions about detailing, restoration, coatings, or booking? Reach out and we&apos;ll help you
              choose the right service for your boat.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Email</p>
                <p className="mt-3 text-lg font-semibold text-white">{company.email}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Phone</p>
                <p className="mt-3 text-lg font-semibold text-white">{company.phone}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Service Area</p>
                <p className="mt-3 text-lg font-semibold text-white">Georgian Bay to Lake Simcoe</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-black pb-24 md:pb-32">
        <div className="page-shell grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_380px] lg:items-start">
          <div className="rounded-[2rem] border border-white/10 bg-[#06121e] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] md:p-8">
            <div className="flex items-start gap-4 border-b border-white/10 pb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12">
                <Send className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">Start the Conversation</p>
                <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">Tell us what your boat needs</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/62 md:text-base">
                  Share a few details and our team will follow up with the right next step, whether that is a quote,
                  service recommendation, or help choosing the best protection package.
                </p>
              </div>
            </div>

            {submitSuccess ? (
              <div className="mt-8 rounded-[1.75rem] border border-primary/25 bg-primary/10 p-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
                  <CheckCircle2 className="h-7 w-7 text-primary" />
                </div>
                <h3 className="mt-5 text-2xl font-bold text-white">Message received</h3>
                <p className="mt-3 max-w-xl text-base leading-8 text-white/70">
                  Thank you for reaching out to A1 Marine Care. Your message is on its way to our team, and we will be
                  in touch shortly.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button onClick={() => setSubmitSuccess(false)} size="lg" className="h-12 px-6 text-base font-semibold">
                    Send Another Message
                  </Button>
                  <Button asChild size="lg" variant="outline" className="h-12 border-white/15 bg-transparent px-6 text-base text-white hover:bg-white/5 hover:text-white">
                    <Link href="/quote">Request a Quote</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <input type="hidden" name="source" value={formData.source} />

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-medium text-white/78">Full Name</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(event) => updateField("fullName", event.target.value)}
                      placeholder="Your full name"
                      className="h-12 rounded-xl border-white/10 bg-white/[0.03] text-white placeholder:text-white/30 focus-visible:ring-primary/70"
                    />
                    {errors.fullName && <p className="text-sm text-red-300">{errors.fullName}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-white/78">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      placeholder="you@example.com"
                      className="h-12 rounded-xl border-white/10 bg-white/[0.03] text-white placeholder:text-white/30 focus-visible:ring-primary/70"
                    />
                    {errors.email && <p className="text-sm text-red-300">{errors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-white/78">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(event) => updateField("phone", event.target.value)}
                      placeholder="(705) 555-0123"
                      className="h-12 rounded-xl border-white/10 bg-white/[0.03] text-white placeholder:text-white/30 focus-visible:ring-primary/70"
                    />
                    {errors.phone && <p className="text-sm text-red-300">{errors.phone}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-sm font-medium text-white/78">Subject</Label>
                    <Input
                      id="subject"
                      value={formData.subject}
                      onChange={(event) => updateField("subject", event.target.value)}
                      placeholder="How can we help?"
                      className="h-12 rounded-xl border-white/10 bg-white/[0.03] text-white placeholder:text-white/30 focus-visible:ring-primary/70"
                    />
                    {errors.subject && <p className="text-sm text-red-300">{errors.subject}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-white/78">Service Interested In</Label>
                  <Select value={formData.serviceInterest} onValueChange={(value) => updateField("serviceInterest", value)}>
                    <SelectTrigger className="h-12 rounded-xl border-white/10 bg-white/[0.03] text-white focus:ring-primary/70">
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general-inquiry">General Inquiry</SelectItem>
                      {services.map((service) => (
                        <SelectItem key={service.slug} value={service.slug}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-sm font-medium text-white/78">Message</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(event) => updateField("message", event.target.value)}
                    placeholder="Tell us about your boat, the service you are considering, your location, and anything else that would help us point you in the right direction."
                    className="min-h-[180px] rounded-xl border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder:text-white/30 focus-visible:ring-primary/70"
                  />
                  {errors.message && <p className="text-sm text-red-300">{errors.message}</p>}
                </div>

                {submitError && (
                  <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    {submitError}
                  </div>
                )}

                <div className="flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-xl text-sm leading-7 text-white/52">
                    We reply with practical guidance, next steps, and booking direction based on your boat, service goals,
                    and service area.
                  </p>
                  <Button type="submit" size="lg" disabled={isSubmitting} className="h-12 px-7 text-base font-semibold">
                    {isSubmitting ? "Sending Message..." : "Send Message"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            )}
          </div>

          <div className="space-y-6 lg:sticky lg:top-28">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 md:p-7">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12">
                  <LifeBuoy className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">Direct Contact</p>
                  <h3 className="mt-1 text-xl font-bold text-white">Speak with our team</h3>
                </div>
              </div>

              <div className="mt-6 space-y-4 text-sm text-white/70">
                <a href={`mailto:${company.email}`} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-4 transition-colors hover:border-primary/30 hover:bg-primary/5">
                  <Mail className="mt-0.5 h-4 w-4 text-primary" />
                  <span>
                    <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/40">Email</span>
                    <span className="mt-1 block text-base font-medium text-white">{company.email}</span>
                  </span>
                </a>
                <a href={`tel:${company.phone.replace(/[^\d+]/g, "")}`} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-4 transition-colors hover:border-primary/30 hover:bg-primary/5">
                  <Phone className="mt-0.5 h-4 w-4 text-primary" />
                  <span>
                    <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-white/40">Phone</span>
                    <span className="mt-1 block text-base font-medium text-white">{company.phone}</span>
                  </span>
                </a>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[#07131d] p-6 md:p-7">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">Service Regions</p>
                  <h3 className="mt-1 text-xl font-bold text-white">Dockside where you need us</h3>
                </div>
              </div>
              <p className="mt-5 text-sm leading-7 text-white/68">
                We regularly serve {regionList}. If your boat is nearby, send your location details and we will let you know the best next step.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {featuredRegions.map((region) => (
                  <span key={region} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-white/60">
                    {region}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-primary/18 bg-primary/[0.07] p-6 md:p-7">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/14">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/90">Need Something Faster?</p>
                  <h3 className="mt-1 text-xl font-bold text-white">Take the next step now</h3>
                </div>
              </div>
              <p className="mt-5 text-sm leading-7 text-white/70">
                If you already know what you need, go straight to a custom quote or reserve a preferred service date.
              </p>
              <div className="mt-6 space-y-3">
                <Link href="/quote" className="group flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm font-medium text-white transition-colors hover:border-primary/30 hover:bg-primary/5">
                  Request a Quote
                  <ChevronRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
                </Link>
                <Link href="/booking" className="group flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-sm font-medium text-white transition-colors hover:border-primary/30 hover:bg-primary/5">
                  Book a Service Date
                  <ChevronRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-neutral-950 py-16 md:py-20">
        <div className="page-shell grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">Why Clients Reach Out</p>
            <h2 className="mt-3 text-3xl font-black text-white md:text-4xl">Guidance without guesswork</h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-white/66">
              Whether you need restoration advice, protection recommendations, seasonal prep, or help deciding between a quote and a booking, we will point you in the right direction quickly and clearly.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-white/70">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Honest recommendations tailored to your boat and condition.
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-white/70">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-primary" />
                Clear follow-up for service, quote, or booking next steps.
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
