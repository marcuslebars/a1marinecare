export type QuoteStepId =
  | "boatLength"
  | "boatType"
  | "services"
  | "addons"
  | "contact"
  | "summary";

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
};

export type BookingFormData = {
  serviceSlug: string;
  locationSlug: string;
  date: string;
  timeSlot: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
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
