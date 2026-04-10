import { MockLeadRepository } from "@/lib/db/mock-repository";
import { PrismaLeadRepository } from "@/lib/db/prisma-repository";
import { SupabaseLeadRepository } from "@/lib/db/supabase-repository";
import type { LeadRepository } from "@/lib/db/types";
import type { QuoteFormData } from "@/types/lead";

function getLeadRepository(): LeadRepository {
  if (process.env.DATABASE_URL) {
    return new PrismaLeadRepository();
  }
  const hasSupabaseConfig =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  return hasSupabaseConfig ? new SupabaseLeadRepository() : new MockLeadRepository();
}

export async function createQuoteLead(payload: Parameters<LeadRepository["createQuoteLead"]>[0]) {
  const repository = getLeadRepository();
  return repository.createQuoteLead(payload);
}

export async function getQuoteLead(id: string): Promise<QuoteFormData | null> {
  const repository = getLeadRepository();
  return repository.getQuoteLead(id);
}

export async function createBookingLead(payload: Parameters<LeadRepository["createBookingLead"]>[0]) {
  const repository = getLeadRepository();
  return repository.createBookingLead(payload);
}
