import type {
  BookingInsertResult,
  CreateBookingLeadInput,
  CreateQuoteLeadInput,
  LeadRepository,
  QuoteInsertResult,
} from "@/lib/db/types";
import { Prisma } from "@prisma/client";
import type { QuoteFormData } from "@/types/lead";
import { prisma } from "@/lib/db/prisma";

export class PrismaLeadRepository implements LeadRepository {
  async createQuoteLead(input: CreateQuoteLeadInput): Promise<QuoteInsertResult> {
    const record = await prisma.quoteLead.create({
      data: {
        boatLength: input.boatLength,
        boatType: input.boatType,
        services: input.services,
        addons: input.addons,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        notes: input.notes || null,
        locationSlug: input.locationSlug,
        estimatedTotal: typeof input.estimatedTotal === "number" ? BigInt(input.estimatedTotal) : null,
        requiresManualReview: input.requiresManualReview || false,
        reviewReasons: input.reviewReasons || [],
        metadata: (input.metadata || {}) as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    return {
      id: record.id,
      createdAt: record.createdAt.toISOString(),
    };
  }

  async getQuoteLead(id: string): Promise<QuoteFormData | null> {
    const record = await prisma.quoteLead.findUnique({
      where: { id },
      select: {
        id: true,
        boatLength: true,
        boatType: true,
        services: true,
        addons: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        notes: true,
        locationSlug: true,
        estimatedTotal: true,
        requiresManualReview: true,
        reviewReasons: true,
        metadata: true,
        createdAt: true,
      },
    });

    if (!record) {
      return null;
    }

    return {
      boatLength: record.boatLength,
      boatType: record.boatType,
      services: record.services || [],
      addons: record.addons || [],
      contactName: record.contactName,
      contactEmail: record.contactEmail,
      contactPhone: record.contactPhone,
      notes: record.notes || "",
      locationSlug: record.locationSlug,
      estimatedTotal: record.estimatedTotal ? Number(record.estimatedTotal) : undefined,
      requiresManualReview: record.requiresManualReview,
      reviewReasons: record.reviewReasons || [],
      metadata: (record.metadata as Record<string, unknown>) || {},
    };
  }

  async createBookingLead(input: CreateBookingLeadInput): Promise<BookingInsertResult> {
    const record = await prisma.bookingRequest.create({
      data: {
        quoteId: input.quoteId || null,
        serviceSlug: input.serviceSlug,
        locationSlug: input.locationSlug,
        date: input.date,
        timeSlot: input.timeSlot,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        notes: input.notes || null,
        status: "pending",
        metadata: (input.metadata || {
          recurrenceType: input.recurrenceType || null,
          bookingMode: input.bookingMode || "one-time",
          boatLength: input.boatLength || null,
          estimatedRecurringRate: input.estimatedRecurringRate ?? null,
          quotedServices: input.quotedServices || [],
        }) as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    return {
      id: record.id,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
