import { NextRequest, NextResponse } from "next/server";
import { getLeadEvents, updateLeadEventStatus, type LeadStatus } from "@/lib/lead-events";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const source = searchParams.get("source") as "quote" | "booking" | "contact" | "condition-report" | "preview" | null;
  const status = searchParams.get("status") as LeadStatus | null;
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  try {
    const result = await getLeadEvents({
      source: source ?? undefined,
      status: status ?? undefined,
      limit,
      offset,
    });

    return NextResponse.json({
      leads: result.leads.map((lead) => ({
        id: lead.id,
        createdAt: lead.createdAt,
        source: lead.source,
        customerName: lead.customerName,
        email: lead.email,
        phone: lead.phone,
        serviceInterest: lead.serviceInterest,
        boatLength: lead.boatLength,
        boatType: lead.boatType,
        locationSlug: lead.locationSlug,
        message: lead.message,
        status: lead.status,
        notificationStatus: lead.notificationStatus,
        resendEmailId: lead.resendEmailId,
        calendarEventId: lead.calendarEventId,
        leadId: lead.leadId,
        leadType: lead.leadType,
      })),
      total: result.total,
      limit,
      offset,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = body as { id: string; status: LeadStatus };

    if (!id || !status) {
      return NextResponse.json({ error: "id and status are required" }, { status: 400 });
    }

    await updateLeadEventStatus(id, status);

    return NextResponse.json({ success: true, id, status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}