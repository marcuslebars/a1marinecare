import type { BookingFormData, QuoteFormData } from "@/types/lead";

export type CreateQuoteLeadInput = QuoteFormData;
export type CreateBookingLeadInput = BookingFormData;

export type QuoteInsertResult = {
  id: string;
  createdAt: string;
};

export type BookingInsertResult = {
  id: string;
  createdAt: string;
};

export interface LeadRepository {
  createQuoteLead(input: CreateQuoteLeadInput): Promise<QuoteInsertResult>;
  createBookingLead(input: CreateBookingLeadInput): Promise<BookingInsertResult>;
}
