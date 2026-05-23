import type { Metadata } from "next";
import { getLeadEvents, getStatusLabel, getLeadStats, type LeadSource } from "@/lib/lead-events";

export const metadata: Metadata = {
  title: "Lead Dashboard",
  description: "Internal lead tracking dashboard",
};

const SOURCE_LABELS: Record<string, string> = {
  quote: "Quote",
  booking: "Booking",
  contact: "Contact",
  "condition-report": "Condition Report",
  preview: "Preview",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  contacted: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  quoted: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  booked: "bg-green-500/10 text-green-400 border-green-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  archived: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const NOTIFICATION_COLORS: Record<string, string> = {
  pending: "text-yellow-400",
  sent: "text-green-400",
  failed: "text-red-400",
  not_configured: "text-gray-400",
};

function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Toronto",
  }).format(d);
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; source?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const limit = 25;
  const offset = (page - 1) * limit;

  const source = params.source as LeadSource | undefined;
  const status = params.status as "new" | "contacted" | "quoted" | "booked" | "completed" | "archived" | undefined;

  const { leads, total } = await getLeadEvents({ source, status, limit, offset });
  const stats = await getLeadStats();
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Lead Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Internal tracking for A1 Marine Care leads</p>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/api/admin/lead-health"
              target="_blank"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              API Health
            </a>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Leads</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-2xl font-bold">{stats.recentQuotes}</div>
            <div className="text-sm text-muted-foreground">Quotes (7d)</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-2xl font-bold">{stats.recentBookings}</div>
            <div className="text-sm text-muted-foreground">Bookings (7d)</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-2xl font-bold text-red-400">{stats.failedNotifications}</div>
            <div className="text-sm text-muted-foreground">Failed Notifications</div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <a
            href="/admin/leads"
            className={`rounded-full px-3 py-1 text-xs font-medium ${!source && !status ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
          >
            All
          </a>
          {["quote", "booking", "contact", "condition-report", "preview"].map((s) => (
            <a
              key={s}
              href={`/admin/leads?source=${s}`}
              className={`rounded-full px-3 py-1 text-xs font-medium ${source === s ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
            >
              {SOURCE_LABELS[s] ?? s}
            </a>
          ))}
          <span className="mx-2 border-l border-border" />
          {["new", "contacted", "quoted", "booked", "completed", "archived"].map((s) => (
            <a
              key={s}
              href={`/admin/leads?status=${s}`}
              className={`rounded-full px-3 py-1 text-xs font-medium ${status === s ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
            >
              {getStatusLabel(s)}
            </a>
          ))}
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Notification</th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No leads found
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="border-b border-border hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <a href={`/admin/leads/${lead.id}`} className="text-sm hover:text-primary">
                          {formatDate(lead.createdAt)}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
                          {SOURCE_LABELS[lead.source] ?? lead.source}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">{lead.customerName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">{lead.email}</div>
                        <div className="text-xs text-muted-foreground">{lead.phone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">{lead.serviceInterest || "—"}</div>
                        {lead.locationSlug && (
                          <div className="text-xs text-muted-foreground">{lead.locationSlug}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[lead.status] ?? "bg-secondary"}`}>
                          {getStatusLabel(lead.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${NOTIFICATION_COLORS[lead.notificationStatus ?? "pending"] ?? ""}`}>
                          {lead.notificationStatus ?? "pending"}
                        </span>
                        {lead.resendEmailId && (
                          <div className="text-xs text-muted-foreground">{lead.resendEmailId}</div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({total} leads)
              </div>
              <div className="flex gap-2">
                {page > 1 && (
                  <a
                    href={`/admin/leads?page=${page - 1}${source ? `&source=${source}` : ""}${status ? `&status=${status}` : ""}`}
                    className="rounded border border-border px-3 py-1 text-sm hover:bg-muted"
                  >
                    Previous
                  </a>
                )}
                {page < totalPages && (
                  <a
                    href={`/admin/leads?page=${page + 1}${source ? `&source=${source}` : ""}${status ? `&status=${status}` : ""}`}
                    className="rounded border border-border px-3 py-1 text-sm hover:bg-muted"
                  >
                    Next
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}