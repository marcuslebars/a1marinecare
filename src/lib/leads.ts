import { MockLeadRepository } from "@/lib/db/mock-repository";
import { PrismaLeadRepository } from "@/lib/db/prisma-repository";
import type { LeadRepository } from "@/lib/db/types";
import type { QuoteFormData } from "@/types/lead";

function getLeadRepository(): LeadRepository {
  if (process.env.DATABASE_URL) {
    return new PrismaLeadRepository();
  }
  return new MockLeadRepository();
}

export async function createQuoteLead(payload: Parameters<LeadRepository["createQuoteLead"]>[0]) {
  const repository = getLeadRepository();
  try {
    return await repository.createQuoteLead(payload);
  } catch (err) {
    if (process.env.DATABASE_URL) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("does not exist") || msg.includes("relation") || msg.includes("table")) {
        throw new Error("Database tables not found. Please run: npx prisma migrate deploy");
      }
    }
    throw err;
  }
}

export async function getQuoteLead(id: string): Promise<QuoteFormData | null> {
  const repository = getLeadRepository();
  return repository.getQuoteLead(id);
}

export async function createBookingLead(payload: Parameters<LeadRepository["createBookingLead"]>[0]) {
  const repository = getLeadRepository();
  return repository.createBookingLead(payload);
}
