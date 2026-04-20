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

export type QuoteInput = z.infer<typeof quoteSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
