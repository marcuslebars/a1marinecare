import { NextResponse } from "next/server";
import { getLeadStats, getLeadEvents, isMissingTableError } from "@/lib/lead-events";

export async function GET() {
  try {
    const stats = await getLeadStats();
    const { leads } = await getLeadEvents({ limit: 10 });

    const emailConfig = {
      resendApiKeyConfigured: !!process.env.RESEND_API_KEY,
      fromEmail: process.env.FROM_EMAIL || "A1 Marine Care <noreply@a1marinecare.ca>",
      toEmail: process.env.CONTACT_TO_EMAIL || process.env.BUSINESS_EMAIL || "contact@a1marinecare.ca",
    };

    const response = {
      timestamp: new Date().toISOString(),
      emailConfig,
      stats,
      recentLeads: leads.map((lead) => ({
        id: lead.id,
        source: lead.source,
        customerName: lead.customerName,
        email: lead.email,
        status: lead.status,
        notificationStatus: lead.notificationStatus,
        createdAt: lead.createdAt,
      })),
    };

    return NextResponse.json(response);
  } catch (err) {
    if (isMissingTableError(err)) {
      console.error("[Lead Health] lead_events table missing. Run: npx prisma migrate deploy");
      return NextResponse.json({
        error: "lead_events table missing. Run: npx prisma migrate deploy",
        code: "P2021",
        timestamp: new Date().toISOString(),
        tableMissing: true,
      }, { status: 503 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Lead Health] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}