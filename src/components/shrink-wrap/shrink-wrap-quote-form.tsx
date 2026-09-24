"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Loader2, MapPin, Phone, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { company, locations } from "@/content/site";
import { newEventId, trackPixelEvent } from "@/lib/meta-pixel";
import {
  calculateShrinkWrapQuote,
  ENGINE_TYPES,
  formatCents,
  HULL_TYPES,
  SHRINK_WRAP,
  type EngineType,
  type HullType,
} from "@/lib/shrink-wrap-pricing";
import { cn } from "@/lib/utils";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"] as const;
const UTM_STORAGE_KEY = "a1mc_utm";

/** Keep in sync with SHRINK_WRAP_DEPOSIT_CENTS on the server (default $250). */
const DEPOSIT_DOLLARS = 250;

const PREFERRED_WINDOWS = ["As soon as possible", "This week", "Next week", "Before Thanksgiving", "Mid-October", "Late October", "I'm flexible"];

type Status = "idle" | "submitting" | "done" | "error";

interface Props {
  /** Pre-select the area when rendered on a /shrink-wrapping/[location] page. */
  defaultLocationSlug?: string;
  compact?: boolean;
}

function readUtm(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const out: Record<string, string> = {};
  try {
    const params = new URLSearchParams(window.location.search);
    for (const key of UTM_KEYS) {
      const value = params.get(key);
      if (value) out[key] = value.slice(0, 200);
    }
    // First-touch wins for the session: an ad click that bounced through the
    // homepage still gets credit when the form is submitted later.
    if (Object.keys(out).length) {
      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(out));
      return out;
    }
    const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Record<string, string>) : {};
  } catch {
    return out;
  }
}

export function ShrinkWrapQuoteForm({ defaultLocationSlug, compact }: Props) {
  const [lengthFt, setLengthFt] = useState(22);
  const [hullType, setHullType] = useState<HullType>("bowrider");
  const [wantsWinterization, setWantsWinterization] = useState(false);
  const [engineType, setEngineType] = useState<EngineType>("sterndrive");
  const [engineCount, setEngineCount] = useState(1);
  const [locationSlug, setLocationSlug] = useState(defaultLocationSlug ?? "");
  const [boatLocation, setBoatLocation] = useState("");
  const [preferredWindow, setPreferredWindow] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<{ quoteId: string | null; subtotalCents: number } | null>(null);
  const [utm, setUtm] = useState<Record<string, string>>({});
  const [depositStatus, setDepositStatus] = useState<"idle" | "redirecting" | "error">("idle");
  const [depositError, setDepositError] = useState("");
  const [resumedNotice, setResumedNotice] = useState("");

  useEffect(() => {
    setUtm(readUtm());
  }, []);

  // Back from a cancelled Stripe checkout: rebuild the quote panel so they can
  // retry the deposit without re-typing everything.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const quoteId = params.get("quoteId");
    if (params.get("deposit") !== "cancelled" || !quoteId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}`);
        if (!res.ok) return;
        const { quote: saved } = (await res.json()) as {
          quote: { boatLength: string; boatType: string; addons?: string[]; contactName: string; contactPhone: string; contactEmail: string; locationSlug: string; estimatedTotal?: number; metadata?: { formType?: string } };
        };
        if (cancelled || saved?.metadata?.formType !== "shrink-wrap-quote") return;
        const savedLength = Number.parseInt(saved.boatLength, 10);
        if (Number.isFinite(savedLength)) setLengthFt(Math.min(Math.max(savedLength, SHRINK_WRAP.minLengthFt), SHRINK_WRAP.maxLengthFt));
        if ((HULL_TYPES as readonly { value: string }[]).some((h) => h.value === saved.boatType)) setHullType(saved.boatType as HullType);
        const winter = saved.addons?.find((a) => a.startsWith("winterization:"));
        if (winter) {
          const [, type, count] = winter.split(":");
          setWantsWinterization(true);
          if ((ENGINE_TYPES as readonly { value: string }[]).some((e) => e.value === type)) setEngineType(type as EngineType);
          const n = Number.parseInt(count, 10);
          if (Number.isFinite(n)) setEngineCount(Math.min(Math.max(n, 1), 4));
        }
        setContactName(saved.contactName);
        setContactPhone(saved.contactPhone);
        setContactEmail(saved.contactEmail);
        setLocationSlug(saved.locationSlug);
        setResult({ quoteId, subtotalCents: typeof saved.estimatedTotal === "number" ? saved.estimatedTotal : 0 });
        setResumedNotice("No charge was made. Your quote is saved — pay the deposit whenever you're ready, or just call us.");
        setStatus("done");
      } catch {
        /* fall through to a fresh form */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function startDeposit() {
    if (!result?.quoteId || depositStatus === "redirecting") return;
    setDepositStatus("redirecting");
    setDepositError("");
    const eventId = newEventId();
    trackPixelEvent(
      "InitiateCheckout",
      { content_name: "shrink-wrap-deposit", content_category: "shrink-wrapping", value: DEPOSIT_DOLLARS, currency: "CAD" },
      eventId,
    );
    try {
      const response = await fetch("/api/shrink-wrap/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: result.quoteId, eventId }),
      });
      const body = await response.json();
      if (!response.ok || !body?.success || !body?.url) {
        throw new Error(body?.error || "We couldn't start the payment.");
      }
      window.location.assign(body.url as string);
    } catch (err) {
      setDepositStatus("error");
      setDepositError(err instanceof Error ? err.message : "We couldn't start the payment. Call us and we'll hold your spot by phone.");
    }
  }

  const quote = useMemo(
    () =>
      calculateShrinkWrapQuote({
        lengthFt,
        hullType,
        winterization: wantsWinterization ? { engineType, engineCount } : null,
      }),
    [lengthFt, hullType, wantsWinterization, engineType, engineCount],
  );

  const canSubmit =
    status !== "submitting" &&
    contactName.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(contactEmail) &&
    contactPhone.replace(/\D/g, "").length >= 7 &&
    locationSlug.length > 0;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setStatus("submitting");
    setErrorMessage("");
    const eventId = newEventId();

    try {
      const response = await fetch("/api/shrink-wrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lengthFt,
          hullType,
          winterization: wantsWinterization ? { engineType, engineCount } : null,
          boatLocation: boatLocation.trim(),
          locationSlug,
          preferredWindow,
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim(),
          notes: notes.trim(),
          eventId,
          utm,
          website,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body?.success) {
        throw new Error(body?.error || "Something went wrong.");
      }
      setResult({ quoteId: body.quoteId ?? null, subtotalCents: body.subtotalCents ?? quote.subtotalCents });
      setStatus("done");
      // Meta Lead event — no PII, value = quoted subtotal so ROAS reads in Ads Manager.
      trackPixelEvent(
        "Lead",
        { content_name: "shrink-wrap-quote", content_category: "shrink-wrapping", value: quote.subtotalCents / 100, currency: "CAD" },
        eventId,
      );
      if (typeof window !== "undefined" && typeof (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag === "function") {
        (window as unknown as { gtag: (...a: unknown[]) => void }).gtag("event", "generate_lead", {
          currency: "CAD",
          value: quote.subtotalCents / 100,
          lead_type: "shrink-wrap",
        });
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong. Please call us instead.");
    }
  }

  if (status === "done" && result) {
    return (
      <div className="rounded-[2rem] border border-primary/40 bg-[#0d1117] p-7 text-white shadow-2xl shadow-black/60 md:p-9">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          <Check className="h-3.5 w-3.5" /> Quote locked in
        </div>
        <h3 className="mt-4 text-3xl font-bold">
          {formatCents(result.subtotalCents)} <span className="text-base font-normal text-white/60">+ HST</span>
        </h3>
        <p className="mt-3 text-sm leading-6 text-white/70">
          Thanks {contactName.split(" ")[0]} — we&apos;ll call you at {contactPhone} within one business hour. Wrap season
          books up in weeks, not months: a ${DEPOSIT_DOLLARS} deposit holds your spot and comes straight off this total.
        </p>
        {resumedNotice ? <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">{resumedNotice}</p> : null}
        <ul className="mt-5 space-y-2 text-sm text-white/80">
          {quote.lineItems.map((item) => (
            <li key={item.key} className="flex justify-between gap-4 border-b border-white/10 pb-2">
              <span>{item.label}</span>
              <span className="font-semibold">{formatCents(item.amountCents)}</span>
            </li>
          ))}
        </ul>

        {result.quoteId ? (
          <div className="mt-6 rounded-[1.25rem] border border-primary/30 bg-primary/[0.07] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-base font-bold text-white">Lock in your spot — ${DEPOSIT_DOLLARS} deposit</p>
                <p className="mt-1 text-xs leading-5 text-white/65">
                  Secure card payment via Stripe. Applied to your invoice — you pay {formatCents(Math.max(result.subtotalCents - DEPOSIT_DOLLARS * 100, 0))} + HST on the day.
                </p>
              </div>
              <Button size="lg" className="gap-2" onClick={startDeposit} disabled={depositStatus === "redirecting"}>
                {depositStatus === "redirecting" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Opening secure checkout…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" /> Pay ${DEPOSIT_DOLLARS} &amp; hold my spot
                  </>
                )}
              </Button>
            </div>
            {depositStatus === "error" ? <p className="mt-3 text-sm text-amber-300">{depositError}</p> : null}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-3">
          {result.quoteId ? (
            <Button asChild variant="heroOutline" size="lg" className="gap-2 border-white/30 text-white hover:bg-white/10">
              <Link href={`/booking?quoteId=${encodeURIComponent(result.quoteId)}`}>
                Pick a date first <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="heroOutline" size="lg" className="gap-2 border-white/30 text-white hover:bg-white/10">
            <a href={`tel:${company.phone.replace(/\D/g, "")}`}>
              <Phone className="h-4 w-4" /> Call {company.phone}
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "relative rounded-[2rem] border border-white/10 bg-[#0d1117] p-6 text-white shadow-2xl shadow-black/60 md:p-8",
        compact && "p-5 md:p-6",
      )}
      aria-label="Instant shrink wrap quote"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Instant quote</p>
          <h3 className="mt-1 text-xl font-semibold">Your price in 30 seconds</h3>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Estimate</p>
          <p className="text-2xl font-bold leading-none text-primary" aria-live="polite">
            {formatCents(quote.subtotalCents)}
          </p>
          <p className="text-[11px] text-white/60">+ HST</p>
        </div>
      </div>

      {/* Boat */}
      <div className="mt-6 space-y-5">
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="sw-length" className="text-sm text-white/90">
              Boat length (overall)
            </Label>
            <span className="text-sm font-semibold">{lengthFt} ft</span>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <Slider
              id="sw-length"
              min={SHRINK_WRAP.minLengthFt}
              max={SHRINK_WRAP.maxLengthFt}
              step={1}
              value={[lengthFt]}
              onValueChange={([v]) => setLengthFt(v)}
              className="flex-1"
              aria-label="Boat length in feet"
            />
            <Input
              type="number"
              inputMode="numeric"
              min={SHRINK_WRAP.minLengthFt}
              max={SHRINK_WRAP.maxLengthFt}
              value={lengthFt}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) setLengthFt(Math.max(SHRINK_WRAP.minLengthFt, Math.min(SHRINK_WRAP.maxLengthFt, Math.round(v))));
              }}
              className="h-10 w-20 rounded-xl border-white/15 bg-[#161d26] text-center text-white"
              aria-label="Boat length in feet (number)"
            />
          </div>
        </div>

        <div>
          <Label className="text-sm text-white/90">Hull type</Label>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {HULL_TYPES.map((h) => (
              <button
                key={h.value}
                type="button"
                onClick={() => setHullType(h.value)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-xs font-medium transition-colors sm:text-sm",
                  hullType === h.value
                    ? "border-primary bg-primary font-semibold text-primary-foreground"
                    : "border-white/10 bg-white/[0.06] text-white/90 hover:border-white/30 hover:bg-white/10",
                )}
                aria-pressed={hullType === h.value}
              >
                {h.label}
              </button>
            ))}
          </div>
          {(hullType === "pontoon" || hullType === "tritoon") && (
            <p className="mt-2 text-xs text-white/55">
              Wide decks take more film and framing — {formatCents(SHRINK_WRAP.hullSurchargePerFootCents[hullType])}/ft is added.
            </p>
          )}
        </div>

        {/* Winterization add-on */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={wantsWinterization}
              onChange={(e) => setWantsWinterization(e.target.checked)}
              className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]"
            />
            <span>
              <span className="block text-sm font-semibold">Add engine winterization — same visit</span>
              <span className="block text-xs text-white/60">
                Outboard {formatCents(SHRINK_WRAP.winterization.outboard.rateCents)} · Sterndrive{" "}
                {formatCents(SHRINK_WRAP.winterization.sterndrive.rateCents)} · Inboard{" "}
                {formatCents(SHRINK_WRAP.winterization.inboard.rateCents)}
              </span>
            </span>
          </label>
          {wantsWinterization && (
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_8rem]">
              <div className="grid grid-cols-3 gap-2">
                {ENGINE_TYPES.map((e) => (
                  <button
                    key={e.value}
                    type="button"
                    onClick={() => setEngineType(e.value)}
                    className={cn(
                      "rounded-xl border px-2 py-2 text-xs font-medium transition-colors",
                      engineType === e.value
                        ? "border-primary bg-primary font-semibold text-primary-foreground"
                        : "border-white/10 bg-white/[0.06] text-white/90 hover:border-white/30 hover:bg-white/10",
                    )}
                    aria-pressed={engineType === e.value}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
              <div>
                <Label htmlFor="sw-engines" className="sr-only">
                  Number of engines
                </Label>
                <select style={{ colorScheme: "dark" }}
                  id="sw-engines"
                  value={engineCount}
                  onChange={(e) => setEngineCount(Number(e.target.value))}
                  className="h-10 w-full rounded-xl border border-white/15 bg-[#161d26] px-3 text-sm text-white"
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n} className="bg-[#161d26] text-white">
                      {n} engine{n > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Where */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="sw-area" className="text-sm text-white/90">
              Nearest area
            </Label>
            <select style={{ colorScheme: "dark" }}
              id="sw-area"
              required
              value={locationSlug}
              onChange={(e) => setLocationSlug(e.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-white/15 bg-[#161d26] px-3 text-sm text-white"
            >
              <option value="" className="bg-[#161d26] text-white">
                Choose…
              </option>
              {locations.map((l) => (
                <option key={l.slug} value={l.slug} className="bg-[#161d26] text-white">
                  {l.name}
                </option>
              ))}
              <option value="other" className="bg-[#161d26] text-white">
                Somewhere else
              </option>
            </select>
          </div>
          <div>
            <Label htmlFor="sw-where" className="text-sm text-white/90">
              Where&apos;s the boat? <span className="text-white/45">(driveway, marina, dock)</span>
            </Label>
            <Input
              id="sw-where"
              value={boatLocation}
              onChange={(e) => setBoatLocation(e.target.value)}
              placeholder="e.g. Driveway in Penetang / Bay Port Marina slip C12"
              className="mt-2 h-11 rounded-xl border-white/15 bg-[#161d26] text-white placeholder:text-white/35"
              maxLength={240}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="sw-window" className="text-sm text-white/90">
            When would you like it done?
          </Label>
          <select style={{ colorScheme: "dark" }}
            id="sw-window"
            value={preferredWindow}
            onChange={(e) => setPreferredWindow(e.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-white/15 bg-[#161d26] px-3 text-sm text-white"
          >
            <option value="" className="bg-[#161d26] text-white">
              Choose…
            </option>
            {PREFERRED_WINDOWS.map((w) => (
              <option key={w} value={w} className="bg-[#161d26] text-white">
                {w}
              </option>
            ))}
          </select>
        </div>

        {/* Contact */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="sw-name" className="text-sm text-white/90">
              Name
            </Label>
            <Input
              id="sw-name"
              required
              autoComplete="name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="mt-2 h-11 rounded-xl border-white/15 bg-[#161d26] text-white"
            />
          </div>
          <div>
            <Label htmlFor="sw-phone" className="text-sm text-white/90">
              Phone
            </Label>
            <Input
              id="sw-phone"
              required
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="mt-2 h-11 rounded-xl border-white/15 bg-[#161d26] text-white"
            />
          </div>
          <div>
            <Label htmlFor="sw-email" className="text-sm text-white/90">
              Email
            </Label>
            <Input
              id="sw-email"
              required
              type="email"
              autoComplete="email"
              inputMode="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="mt-2 h-11 rounded-xl border-white/15 bg-[#161d26] text-white"
            />
          </div>
        </div>

        <details className="group">
          <summary className="cursor-pointer text-sm text-white/60 hover:text-white">Add a note (optional)</summary>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Radar arch, tower, gate code, anything we should know."
            className="mt-2 min-h-20 rounded-xl border-white/15 bg-[#161d26] text-white placeholder:text-white/35"
            maxLength={5000}
          />
        </details>

        {/* Honeypot */}
        <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
          <label>
            Website
            <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
        </div>

        {quote.requiresManualReview && (
          <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
            {quote.reviewReasons.join(" · ")} — send it anyway and we&apos;ll confirm the price on the call.
          </p>
        )}

        {status === "error" && (
          <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
            {errorMessage} Or call us at{" "}
            <a href={`tel:${company.phone.replace(/\D/g, "")}`} className="underline">
              {company.phone}
            </a>
            .
          </p>
        )}

        <Button type="submit" size="lg" disabled={!canSubmit} className="w-full gap-2 text-base">
          {status === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Lock in {formatCents(quote.subtotalCents)} — get my quote
          <ArrowRight className="h-4 w-4" />
        </Button>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-white/60">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> No payment now
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" /> We come to you
          </span>
          <span>
            By submitting you agree to our{" "}
            <a href="https://a1marine.ca/terms" className="underline" target="_blank" rel="noreferrer">
              terms
            </a>
            .
          </span>
        </div>
      </div>
    </form>
  );
}
