import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { Resend } from "resend";

export type LeadSource = "quote" | "booking" | "contact" | "condition-report" | "preview";

export type LeadStatus = "new" | "contacted" | "quoted" | "booked" | "completed" | "archived";

export type NotificationStatus = "pending" | "sent" | "failed" | "not_configured";

export interface LeadEventInput {
  source: LeadSource;
  customerName: string;
  email: string;
  phone: string;
  serviceInterest?: string;
  boatLength?: string;
  boatType?: string;
  locationSlug?: string;
  message?: string;
  rawPayload?: Record<string, unknown>;
  leadId?: string;
  leadType?: string;
  metadata?: Record<string, unknown>;
}

export interface LeadEventRecord {
  id: string;
  createdAt: Date;
  source: string;
  customerName: string;
  email: string;
  phone: string;
  serviceInterest: string | null;
  boatLength: string | null;
  boatType: string | null;
  locationSlug: string | null;
  message: string | null;
  status: string;
  rawPayload: Record<string, unknown>;
  notificationStatus: string | null;
  resendEmailId: string | null;
  calendarEventId: string | null;
  leadId: string | null;
  leadType: string | null;
  metadata: Record<string, unknown>;
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  booked: "Booked",
  completed: "Completed",
  archived: "Archived",
};

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status as LeadStatus] ?? status;
}

export async function createLeadEvent(input: LeadEventInput): Promise<LeadEventRecord> {
  const record = await prisma.leadEvent.create({
    data: {
      source: input.source,
      customerName: input.customerName,
      email: input.email,
      phone: input.phone,
      serviceInterest: input.serviceInterest ?? null,
      boatLength: input.boatLength ?? null,
      boatType: input.boatType ?? null,
      locationSlug: input.locationSlug ?? null,
      message: input.message ?? null,
      status: "new",
      rawPayload: (input.rawPayload ?? {}) as Prisma.InputJsonValue,
      notificationStatus: "pending",
      leadId: input.leadId ?? null,
      leadType: input.leadType ?? null,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });

  return record as LeadEventRecord;
}

export async function updateLeadEventNotification(
  id: string,
  status: NotificationStatus,
  resendEmailId?: string,
  error?: string
): Promise<void> {
  await prisma.leadEvent.update({
    where: { id },
    data: {
      notificationStatus: status,
      resendEmailId: resendEmailId ?? null,
      metadata: error ? { lastError: error } : {},
    },
  });
}

export async function updateLeadEventCalendar(
  id: string,
  calendarEventId: string
): Promise<void> {
  await prisma.leadEvent.update({
    where: { id },
    data: {
      calendarEventId,
    },
  });
}

export async function updateLeadEventStatus(
  id: string,
  status: LeadStatus
): Promise<void> {
  await prisma.leadEvent.update({
    where: { id },
    data: { status },
  });
}

export async function getLeadEvents(options?: {
  source?: LeadSource;
  status?: LeadStatus;
  limit?: number;
  offset?: number;
}): Promise<{ leads: LeadEventRecord[]; total: number }> {
  const where: Record<string, unknown> = {};
  if (options?.source) where.source = options.source;
  if (options?.status) where.status = options.status;

  const [leads, total] = await Promise.all([
    prisma.leadEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    }),
    prisma.leadEvent.count({ where }),
  ]);

  return { leads: leads as LeadEventRecord[], total };
}

export async function getLeadEventById(id: string): Promise<LeadEventRecord | null> {
  const record = await prisma.leadEvent.findUnique({ where: { id } });
  return record as LeadEventRecord | null;
}

export async function getLeadStats(): Promise<{
  total: number;
  bySource: Record<string, number>;
  byStatus: Record<string, number>;
  recentQuotes: number;
  recentBookings: number;
  failedNotifications: number;
}> {
  const [leads, quoteCount, bookingCount, failedCount] = await Promise.all([
    prisma.leadEvent.findMany({ select: { source: true, status: true, notificationStatus: true } }),
    prisma.leadEvent.count({ where: { source: "quote", createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    prisma.leadEvent.count({ where: { source: "booking", createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    prisma.leadEvent.count({ where: { notificationStatus: "failed" } }),
  ]);

  const bySource: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  for (const lead of leads) {
    bySource[lead.source] = (bySource[lead.source] ?? 0) + 1;
    byStatus[lead.status] = (byStatus[lead.status] ?? 0) + 1;
  }

  return {
    total: leads.length,
    bySource,
    byStatus,
    recentQuotes: quoteCount,
    recentBookings: bookingCount,
    failedNotifications: failedCount,
  };
}

export async function sendLeadNotificationEmail(
  leadEventId: string,
  input: {
    subject: string;
    html: string;
    replyTo?: string;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.BUSINESS_EMAIL || "contact@a1marinecare.ca";
  const fromEmail = process.env.FROM_EMAIL || "A1 Marine Care <noreply@a1marinecare.ca>";

  if (!apiKey) {
    await updateLeadEventNotification(leadEventId, "not_configured");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const resend = new Resend(apiKey);
    const response = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      replyTo: input.replyTo,
      subject: input.subject,
      html: input.html,
    });

    if (response.error) {
      await updateLeadEventNotification(leadEventId, "failed", undefined, response.error.message);
      return { success: false, error: response.error.message };
    }

    await updateLeadEventNotification(leadEventId, "sent", response.data?.id);
    return { success: true, messageId: response.data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await updateLeadEventNotification(leadEventId, "failed", undefined, msg);
    return { success: false, error: msg };
  }
}