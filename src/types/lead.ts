export type QuoteStepId =
  | "boatLength"
  | "boatType"
  | "services"
  | "addons"
  | "contact"
  | "summary";

export type RecurrenceType = "weekly" | "biweekly";

export type QuoteFormData = {
  boatLength: string;
  boatType: string;
  services: string[];
  addons: string[];
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
  locationSlug: string;
  estimatedTotal?: number;
  requiresManualReview?: boolean;
  reviewReasons?: string[];
  metadata?: Record<string, unknown>;
};

export type BookingFormData = {
  quoteId?: string | null;
  serviceSlug: string;
  locationSlug: string;
  date: string;
  timeSlot: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
  boatLength?: string;
  recurrenceType?: RecurrenceType | null;
  bookingMode?: "one-time" | "recurring";
  estimatedRecurringRate?: number;
  serviceDisplayName?: string;
  quotedServices?: string[];
  metadata?: Record<string, unknown>;
};

export type LeadRecord = {
  id: string;
  type: "quote" | "booking";
  createdAt: string;
};

export type QuoteLeadRecord = LeadRecord & {
  type: "quote";
  payload: QuoteFormData;
};

export type BookingLeadRecord = LeadRecord & {
  type: "booking";
  payload: BookingFormData;
};
