import type {
  BookingInsertResult,
  CreateBookingLeadInput,
  CreateQuoteLeadInput,
  LeadRepository,
  QuoteInsertResult,
} from "@/lib/db/types";
import type { QuoteFormData } from "@/types/lead";

function createId(prefix: "q" | "b") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

const quoteStore = new Map<string, { createdAt: string; payload: QuoteFormData }>();

export class MockLeadRepository implements LeadRepository {
  async createQuoteLead(input: CreateQuoteLeadInput): Promise<QuoteInsertResult> {
    const id = createId("q");
    const createdAt = new Date().toISOString();
    quoteStore.set(id, { createdAt, payload: input });
    return { id, createdAt };
  }

  async getQuoteLead(id: string): Promise<QuoteFormData | null> {
    const record = quoteStore.get(id);
    return record?.payload ?? null;
  }

  async createBookingLead(_input: CreateBookingLeadInput): Promise<BookingInsertResult> {
    return {
      id: createId("b"),
      createdAt: new Date().toISOString(),
    };
  }
}
