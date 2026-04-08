import type {
  BookingInsertResult,
  CreateBookingLeadInput,
  CreateQuoteLeadInput,
  LeadRepository,
  QuoteInsertResult,
} from "@/lib/db/types";

type SupabaseInsertResponse = {
  id: string;
  created_at: string;
};

function createId(prefix: "q" | "b") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export class SupabaseLeadRepository implements LeadRepository {
  async createQuoteLead(_input: CreateQuoteLeadInput): Promise<QuoteInsertResult> {
    // Placeholder for future Supabase SDK integration.
    // Implement with server-only client and typed tables.
    const response: SupabaseInsertResponse = {
      id: createId("q"),
      created_at: new Date().toISOString(),
    };

    return {
      id: response.id,
      createdAt: response.created_at,
    };
  }

  async createBookingLead(_input: CreateBookingLeadInput): Promise<BookingInsertResult> {
    const response: SupabaseInsertResponse = {
      id: createId("b"),
      created_at: new Date().toISOString(),
    };

    return {
      id: response.id,
      createdAt: response.created_at,
    };
  }
}
