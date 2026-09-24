import { createLeadEvent, isMissingTableError, sendLeadNotificationEmail } from "@/lib/lead-events";
import { createQuoteLead } from "@/lib/leads";
import { sendToCrm } from "@/lib/crm-webhook";
import { getLocationBySlug, locations } from "@/content/site";
import { calculateShrinkWrapQuote, formatCents, type EngineType, type HullType } from "@/lib/shrink-wrap-pricing";

import { isPlaceholderEmail, placeholderEmailForPhone } from "./auth";

// Marina's phone quote: the same pipeline as the website's instant quote
// (lead_events row → quote lead → owner email → CRM/EmpireVu), priced by the
// same calculator, stamped as a phone lead. The quote id it returns is what
// the booking + deposit tools take next.

const HULLS: Record<string, HullType> = {
  bowrider: "bowrider",
  runabout: "bowrider",
  "bow rider": "bowrider",
  deckboat: "bowrider",
  "deck boat": "bowrider",
  cuddy: "cuddy",
  "cuddy cabin": "cuddy",
  cruiser: "cruiser",
  "express cruiser": "cruiser",
  yacht: "cruiser",
  pontoon: "pontoon",
  tritoon: "tritoon",
  "tri-toon": "tritoon",
  sailboat: "sailboat",
  sail: "sailboat",
  pwc: "pwc",
  "sea-doo": "pwc",
  seadoo: "pwc",
  "sea doo": "pwc",
  jetski: "pwc",
  "jet ski": "pwc",
  waverunner: "pwc",
  other: "other",
  fishing: "other",
  "fishing boat": "other",
  "bass boat": "other",
  "center console": "other",
  aluminum: "other",
};

export function parseHullType(value: unknown): HullType {
  if (typeof value !== "string") return "other";
  const v = value.trim().toLowerCase();
  if (HULLS[v]) return HULLS[v];
  for (const [key, hull] of Object.entries(HULLS)) {
    if (v.includes(key)) return hull;
  }
  return "other";
}

export function parseEngineType(value: unknown): EngineType | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (!v || v === "none" || v === "no") return null;
  if (v.includes("outboard")) return "outboard";
  if (v.includes("stern") || v.includes("i/o") || v === "io" || v.includes("inboard/outboard") || v.includes("mercruiser") || v.includes("volvo")) return "sterndrive";
  if (v.includes("inboard") || v.includes("v-drive") || v.includes("direct drive")) return "inboard";
  return null;
}

export function parseLengthFt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string") {
    const m = value.match(/(\d{1,3})(?:\.\d+)?/);
    if (m) return Number(m[1]);
  }
  return null;
}

/** Map a spoken town/area onto one of the site's location slugs (used for routing + SEO pages). Falls back to georgian-bay. */
export function resolveLocationSlug(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "georgian-bay";
  const v = value.trim().toLowerCase();
  const direct = locations.find((l) => v === l.slug || v === l.name.toLowerCase());
  if (direct) return direct.slug;
  const partial = locations.find((l) => v.includes(l.name.toLowerCase()) || v.includes(l.slug.replace(/-/g, " ")));
  if (partial) return partial.slug;
  if (/(tiny|wyevale|lafontaine|balm beach|wasaga|elmvale|coldwater|victoria harbour|waubaushene)/.test(v)) return "midland";
  if (/(muskoka|bala|huntsville|torrance|minett)/.test(v)) return "muskoka";
  if (/(simcoe|keswick|beaverton|kempenfelt|oro)/.test(v)) return "lake-simcoe";
  return "georgian-bay";
}

export type PhoneQuoteInput = {
  contactName: string;
  contactPhone: string;
  contactEmail?: string | null;
  lengthFt: number;
  hullType: HullType;
  engineType?: EngineType | null;
  engineCount?: number | null;
  boatLocation?: string | null;
  town?: string | null;
  notes?: string | null;
  retellCallId?: string | null;
};

export type PhoneQuoteResult = {
  quoteId: string | null;
  subtotalCents: number;
  lineItems: { label: string; amountCents: number }[];
  requiresManualReview: boolean;
  reviewReasons: string[];
  spokenSummary: string;
};

function spokenDollars(cents: number): string {
  const dollars = Math.round(cents) / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export async function createPhoneShrinkWrapQuote(input: PhoneQuoteInput): Promise<PhoneQuoteResult> {
  const winterization = input.engineType ? { engineType: input.engineType, engineCount: Math.max(1, Math.min(4, input.engineCount ?? 1)) } : null;
  const quote = calculateShrinkWrapQuote({ lengthFt: input.lengthFt, hullType: input.hullType, winterization });

  const locationSlug = resolveLocationSlug(input.town ?? input.boatLocation ?? "");
  const location = getLocationBySlug(locationSlug);
  const locationLabel = location ? `${location.name}, ${location.region}` : locationSlug;
  const services = ["Shrink Wrapping"];
  if (winterization) services.push("Winterization");
  const email = input.contactEmail?.trim() || placeholderEmailForPhone(input.contactPhone);
  const notes = [
    "Quoted by Marina (phone).",
    input.boatLocation ? `Boat location: ${input.boatLocation}` : "",
    input.retellCallId ? `Retell call ${input.retellCallId}.` : "",
    input.notes ?? "",
  ]
    .filter(Boolean)
    .join("\n");

  let leadEventId: string | null = null;
  try {
    const leadEvent = await createLeadEvent({
      source: "quote",
      customerName: input.contactName,
      email,
      phone: input.contactPhone,
      serviceInterest: services.join(", "),
      boatLength: String(input.lengthFt),
      boatType: input.hullType,
      locationSlug,
      message: notes,
      rawPayload: { ...input, quotedSubtotalCents: quote.subtotalCents, lineItems: quote.lineItems },
      leadType: "shrink-wrap",
      metadata: {
        formType: "shrink-wrap-quote",
        channel: "marina",
        retellCallId: input.retellCallId ?? null,
        emailPlaceholder: isPlaceholderEmail(email),
        requiresManualReview: quote.requiresManualReview,
        reviewReasons: quote.reviewReasons,
      },
    });
    leadEventId = leadEvent.id;
  } catch (err) {
    if (!isMissingTableError(err)) console.error("[Marina quote] lead event failed:", err instanceof Error ? err.message : String(err));
  }

  let quoteId: string | null = null;
  try {
    const record = await createQuoteLead({
      boatLength: String(input.lengthFt),
      boatType: input.hullType,
      services,
      addons: winterization ? [`winterization:${winterization.engineType}:${winterization.engineCount}`] : [],
      contactName: input.contactName,
      contactEmail: email,
      contactPhone: input.contactPhone,
      notes,
      locationSlug,
      estimatedTotal: quote.subtotalCents,
      requiresManualReview: quote.requiresManualReview,
      reviewReasons: quote.reviewReasons,
      metadata: { formType: "shrink-wrap-quote", channel: "marina", retellCallId: input.retellCallId ?? null, lineItems: quote.lineItems, emailPlaceholder: isPlaceholderEmail(email) },
    });
    quoteId = record.id;
  } catch (err) {
    console.error("[Marina quote] quote lead save failed:", err instanceof Error ? err.message : String(err));
  }

  const lines = quote.lineItems.map((i) => `<li>${i.label}: <strong>${formatCents(i.amountCents)}</strong> <span style="color:#889">${i.description}</span></li>`).join("");
  void sendLeadNotificationEmail(leadEventId ?? "", {
    subject: `📞 Marina quote — ${input.contactName} · ${input.lengthFt} ft ${input.hullType} · ${formatCents(quote.subtotalCents)}`,
    html: `<div style="font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.6;color:#111">
      <h2 style="margin:0 0 12px">Marina quoted a shrink wrap on the phone</h2>
      <p><strong>${input.contactName}</strong> · ${input.contactPhone}${isPlaceholderEmail(email) ? "" : ` · ${email}`}</p>
      <p>${input.lengthFt} ft ${input.hullType}${winterization ? ` · winterization ${winterization.engineType} × ${winterization.engineCount}` : ""}<br/>Area: ${locationLabel}${input.boatLocation ? `<br/>Boat is: ${input.boatLocation}` : ""}</p>
      <ul>${lines}</ul>
      <p><strong>Total ${formatCents(quote.subtotalCents)} + HST</strong>${quote.requiresManualReview ? `<br/><span style="color:#b45309">Needs manual review: ${quote.reviewReasons.join("; ")}</span>` : ""}</p>
      <p style="color:#667;font-size:12px">Quote ID ${quoteId ?? "n/a"} · Lead ${leadEventId ?? "n/a"}${input.retellCallId ? ` · Retell ${input.retellCallId}` : ""}</p>
    </div>`,
  }).catch(() => {});

  sendToCrm({
    source: "quote",
    leadTag: "a1marinecare-shrink-wrap",
    name: input.contactName,
    email,
    phone: input.contactPhone,
    service: services.join(", "),
    boatLength: String(input.lengthFt),
    boatType: input.hullType,
    marina: input.boatLocation || locationLabel,
    notes: [`Quoted ${formatCents(quote.subtotalCents)} by Marina (phone) (${quote.lineItems.map((i) => `${i.label} ${formatCents(i.amountCents)}`).join(", ")})`, notes].filter(Boolean).join("\n"),
  });

  const wrapLine = quote.lineItems.find((i) => i.key === "shrink_wrap");
  const surcharge = quote.lineItems.find((i) => i.key === "hull_surcharge");
  const winter = quote.lineItems.find((i) => i.key === "winterization");
  const parts: string[] = [];
  if (wrapLine) {
    const wrapTotal = (wrapLine.amountCents ?? 0) + (surcharge?.amountCents ?? 0);
    parts.push(`The shrink wrap for a ${input.lengthFt}-foot ${input.hullType === "other" ? "boat" : input.hullType} comes to ${spokenDollars(wrapTotal)}`);
  }
  if (winter) parts.push(`winterization is ${spokenDollars(winter.amountCents)}`);
  const spokenSummary = quote.requiresManualReview
    ? `That one's outside what I can price on the phone (${quote.reviewReasons.join("; ")}), so Marcus will quote it personally.`
    : `${parts.join(", and ")}. That's ${spokenDollars(quote.subtotalCents)} all in, plus HST. A $250 deposit holds your date and comes straight off that.`;

  return {
    quoteId,
    subtotalCents: quote.subtotalCents,
    lineItems: quote.lineItems.map((i) => ({ label: i.label, amountCents: i.amountCents })),
    requiresManualReview: quote.requiresManualReview,
    reviewReasons: quote.reviewReasons,
    spokenSummary,
  };
}
