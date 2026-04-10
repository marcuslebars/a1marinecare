import type {
  BookingInsertResult,
  CreateBookingLeadInput,
  CreateQuoteLeadInput,
  LeadRepository,
  QuoteInsertResult,
} from "@/lib/db/types";
import type { QuoteFormData } from "@/types/lead";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export class SupabaseLeadRepository implements LeadRepository {
  async createQuoteLead(input: CreateQuoteLeadInput): Promise<QuoteInsertResult> {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from("quote_leads")
      .insert({
        boat_length: input.boatLength,
        boat_type: input.boatType,
        services: input.services,
        addons: input.addons,
        contact_name: input.contactName,
        contact_email: input.contactEmail,
        contact_phone: input.contactPhone,
        notes: input.notes || null,
        location_slug: input.locationSlug,
        estimated_total: null,
        requires_manual_review: false,
        review_reasons: [],
      })
      .select("id, created_at")
      .single();

    if (error) {
      console.error("Supabase createQuoteLead error:", error);
      throw new Error(`Failed to create quote lead: ${error.message}`);
    }

    return {
      id: data.id,
      createdAt: data.created_at,
    };
  }

  async getQuoteLead(id: string): Promise<QuoteFormData | null> {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from("quote_leads")
      .select(
        `
        id,
        boat_length,
        boat_type,
        services,
        addons,
        contact_name,
        contact_email,
        contact_phone,
        notes,
        location_slug,
        estimated_total,
        created_at
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("Supabase getQuoteLead error:", error);
      throw new Error(`Failed to fetch quote lead: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return {
      boatLength: data.boat_length,
      boatType: data.boat_type,
      services: data.services || [],
      addons: data.addons || [],
      contactName: data.contact_name,
      contactEmail: data.contact_email,
      contactPhone: data.contact_phone,
      notes: data.notes || "",
      locationSlug: data.location_slug,
    };
  }

  async createBookingLead(input: CreateBookingLeadInput): Promise<BookingInsertResult> {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from("booking_requests")
      .insert({
        service_slug: input.serviceSlug,
        location_slug: input.locationSlug,
        date: input.date,
        time_slot: input.timeSlot,
        contact_name: input.contactName,
        contact_email: input.contactEmail,
        contact_phone: input.contactPhone,
        notes: input.notes || null,
        status: "pending",
      })
      .select("id, created_at")
      .single();

    if (error) {
      console.error("Supabase createBookingLead error:", error);
      throw new Error(`Failed to create booking request: ${error.message}`);
    }

    return {
      id: data.id,
      createdAt: data.created_at,
    };
  }
}
