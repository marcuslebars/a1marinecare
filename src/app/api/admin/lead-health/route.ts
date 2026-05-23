import { NextResponse } from "next/server";
import { getLeadStats, getLeadEvents } from "@/lib/lead-events";

export async function GET() {
  try {
    const stats = await getLeadStats();
    const { leads } = await getLeadEvents({ limit: 10 });

    const response = {
      timestamp: new Date().toISOString(),
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
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Lead Health] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}