import { z } from "zod";

export const quoteSchema = z.object({
  boatLength: z.string().min(1),
  boatType: z.string().min(2),
  services: z.array(z.string()).min(1),
  addons: z.array(z.string()),
  contactName: z.string().min(2),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(7),
  notes: z.string().max(1200).optional().default(""),
  locationSlug: z.string().min(1),
});

export const bookingSchema = z.object({
  quoteId: z.string().optional().nullable(),
  serviceSlug: z.string().min(1),
  locationSlug: z.string().min(1),
  date: z.string().min(1),
  timeSlot: z.string().min(1),
  contactName: z.string().min(2),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(7),
  notes: z.string().max(1200).optional().default(""),
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
