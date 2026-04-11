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

export type QuoteInput = z.infer<typeof quoteSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
