import { NextResponse } from "next/server";

import { getQuoteLead } from "@/lib/leads";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log("[Quote Load] requested quoteId:", id);
    const quote = await getQuoteLead(id);

    if (!quote) {
      console.log("[Quote Load] quote NOT FOUND:", id);
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      );
    }

    console.log("[Quote Load] quote found:", id);
    return NextResponse.json({ quote });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Quote Load] FAILED:", msg);
    return NextResponse.json(
      { error: "Failed to fetch quote" },
      { status: 500 }
    );
  }
}
