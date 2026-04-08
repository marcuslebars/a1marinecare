import type {
  BookingInsertResult,
  CreateBookingLeadInput,
  CreateQuoteLeadInput,
  LeadRepository,
  QuoteInsertResult,
} from "@/lib/db/types";

function createId(prefix: "q" | "b") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export class MockLeadRepository implements LeadRepository {
  async createQuoteLead(_input: CreateQuoteLeadInput): Promise<QuoteInsertResult> {
    return {
      id: createId("q"),
      createdAt: new Date().toISOString(),
    };
  }

  async createBookingLead(_input: CreateBookingLeadInput): Promise<BookingInsertResult> {
    return {
      id: createId("b"),
      createdAt: new Date().toISOString(),
    };
  }
}
