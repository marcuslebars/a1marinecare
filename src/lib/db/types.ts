import type { BookingFormData, QuoteFormData } from "@/types/lead";

export type CreateQuoteLeadInput = QuoteFormData;
export type CreateBookingLeadInput = BookingFormData & {
  quoteId?: string | null;
};

export type QuoteInsertResult = {
  id: string;
  createdAt: string;
};

export type BookingInsertResult = {
  id: string;
  createdAt: string;
  googleCalendarEventId?: string | null;
};

export interface LeadRepository {
  createQuoteLead(input: CreateQuoteLeadInput): Promise<QuoteInsertResult>;
  getQuoteLead(id: string): Promise<QuoteFormData | null>;
  createBookingLead(input: CreateBookingLeadInput): Promise<BookingInsertResult>;
}
