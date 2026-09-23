import { z } from "zod";

export const quoteSchema = z.object({
  boatLength: z.string().min(1),
  boatType: z.string().min(2),
  services: z.array(z.string()).min(1),
  addons: z.array(z.string()),
  contactName: z.string().min(2),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(7),
  notes: z.string().max(5000).optional().default(""),
  locationSlug: z.string().min(1),
  estimatedTotal: z.number().int().nonnegative().optional(),
  requiresManualReview: z.boolean().optional(),
  reviewReasons: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const bookingSchema = z.object({
  quoteId: z.string().optional().nullable(),
  serviceSlug: z.string().min(1),
  serviceDisplayName: z.string().min(2).optional(),
  quotedServices: z.array(z.string()).optional(),
  locationSlug: z.string().min(1),
  date: z.string().min(1),
  timeSlot: z.string().min(1),
  contactName: z.string().min(2),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(7),
  notes: z.string().max(5000).optional().default(""),
  boatLength: z.string().optional(),
  recurrenceType: z.enum(["weekly", "biweekly"]).optional().nullable(),
  bookingMode: z.enum(["one-time", "recurring"]).optional(),
  estimatedRecurringRate: z.number().nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const contactSchema = z.object({
  fullName: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().min(7),
  subject: z.string().trim().min(3).max(160),
  serviceInterest: z.string().trim().optional().default("general-inquiry"),
  message: z.string().trim().min(10).max(2500),
  source: z.string().trim().max(120).optional().default("contact-page"),
});

// Mobile shrink-wrap instant quote (POST /api/shrink-wrap). The server
// re-prices from these fields; any client total is ignored.
export const shrinkWrapQuoteSchema = z.object({
  lengthFt: z.number().int().min(1).max(200),
  hullType: z.enum(["bowrider", "cuddy", "cruiser", "pontoon", "tritoon", "sailboat", "pwc", "other"]),
  winterization: z
    .object({
      engineType: z.enum(["outboard", "sterndrive", "inboard"]),
      engineCount: z.number().int().min(1).max(4),
    })
    .nullable()
    .optional(),
  boatLocation: z.string().trim().max(240).optional().default(""),
  locationSlug: z.string().trim().min(1).max(80),
  preferredWindow: z.string().trim().max(80).optional().default(""),
  contactName: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().email(),
  contactPhone: z.string().trim().min(7).max(40),
  notes: z.string().trim().max(5000).optional().default(""),
  eventId: z.string().trim().max(80).optional(),
  utm: z.record(z.string(), z.string().max(200)).optional(),
  // Honeypot — bots fill it, people never see it.
  website: z.string().max(500).optional().default(""),
});

export type ShrinkWrapQuoteInput = z.infer<typeof shrinkWrapQuoteSchema>;

export type QuoteInput = z.infer<typeof quoteSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
