import { MockLeadRepository } from "@/lib/db/mock-repository";
import { SupabaseLeadRepository } from "@/lib/db/supabase-repository";
import type { LeadRepository } from "@/lib/db/types";

function getLeadRepository(): LeadRepository {
  const useSupabase = process.env.LEAD_PROVIDER === "supabase";
  return useSupabase ? new SupabaseLeadRepository() : new MockLeadRepository();
}

export async function createQuoteLead(payload: Parameters<LeadRepository["createQuoteLead"]>[0]) {
  const repository = getLeadRepository();
  return repository.createQuoteLead(payload);
}

export async function createBookingLead(payload: Parameters<LeadRepository["createBookingLead"]>[0]) {
  const repository = getLeadRepository();
  return repository.createBookingLead(payload);
}
