import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLeadEventById, getStatusLabel, updateLeadEventStatus, type LeadStatus } from "@/lib/lead-events";

export const metadata: Metadata = {
  title: "Lead Detail",
};

const STATUS_OPTIONS: LeadStatus[] = ["new", "contacted", "quoted", "booked", "completed", "archived"];

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  contacted: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  quoted: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  booked: "bg-green-500/10 text-green-400 border-green-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  archived: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Toronto",
  }).format(d);
}

function formatJson(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

async function handleStatusUpdate(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const status = formData.get("status") as LeadStatus;
  if (id && status) {
    await updateLeadEventStatus(id, status);
  }
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLeadEventById(id);

  if (!lead) {
    notFound();
  }

  const rawPayload = lead.rawPayload as Record<string, unknown>;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <a href="/admin/leads" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to Leads
            </a>
            <h1 className="mt-2 text-2xl font-bold">Lead Detail</h1>
          </div>
          <div>
            <form action={handleStatusUpdate}>
              <input type="hidden" name="id" value={lead.id} />
              <select
                name="status"
                defaultValue={lead.status}
                className="rounded border border-border bg-card px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{getStatusLabel(s)}</option>
                ))}
              </select>
              <button
                type="submit"
                className="ml-2 rounded bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90"
              >
                Update Status
              </button>
            </form>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-sm font-medium">
            {lead.source}
          </span>
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${STATUS_COLORS[lead.status] ?? ""}`}>
            {getStatusLabel(lead.status)}
          </span>
          <span className="text-sm text-muted-foreground">
            {formatDate(lead.createdAt)}
          </span>
        </div>

        <div className="mb-6 rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Customer Information</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Name</div>
              <div className="text-sm">{lead.customerName}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Email</div>
              <div className="text-sm">{lead.email}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Phone</div>
              <div className="text-sm">{lead.phone}</div>
            </div>
            {lead.serviceInterest && (
              <div>
                <div className="text-xs font-medium text-muted-foreground">Service Interest</div>
                <div className="text-sm">{lead.serviceInterest}</div>
              </div>
            )}
            {lead.boatLength && (
              <div>
                <div className="text-xs font-medium text-muted-foreground">Boat Length</div>
                <div className="text-sm">{lead.boatLength}</div>
              </div>
            )}
            {lead.boatType && (
              <div>
                <div className="text-xs font-medium text-muted-foreground">Boat Type</div>
                <div className="text-sm">{lead.boatType}</div>
              </div>
            )}
            {lead.locationSlug && (
              <div>
                <div className="text-xs font-medium text-muted-foreground">Location</div>
                <div className="text-sm">{lead.locationSlug}</div>
              </div>
            )}
          </div>
          {lead.message && (
            <div className="mt-4">
              <div className="text-xs font-medium text-muted-foreground">Message / Notes</div>
              <div className="mt-1 whitespace-pre-wrap text-sm">{lead.message}</div>
            </div>
          )}
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Notification Status</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">{lead.notificationStatus ?? "pending"}</span>
              </div>
              {lead.resendEmailId && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Resend ID</span>
                  <span className="font-mono text-xs">{lead.resendEmailId}</span>
                </div>
              )}
              {lead.calendarEventId && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Calendar Event</span>
                  <span className="font-mono text-xs">{lead.calendarEventId}</span>
                </div>
              )}
            </div>
          </div>

          {lead.leadId && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-2 text-sm font-semibold">Linked Records</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Lead Type</span>
                  <span className="font-medium">{lead.leadType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Lead ID</span>
                  <span className="font-mono text-xs">{lead.leadId}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Raw Payload</h3>
          <pre className="overflow-x-auto text-xs text-muted-foreground">
            {formatJson(rawPayload)}
          </pre>
        </div>

        <div className="mt-6 rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Internal Metadata</h3>
          <pre className="overflow-x-auto text-xs text-muted-foreground">
            {formatJson(lead.metadata ?? {})}
          </pre>
        </div>
      </div>
    </div>
  );
}