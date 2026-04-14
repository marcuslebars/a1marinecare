import { NextResponse } from "next/server";

import { createQuoteLead } from "@/lib/leads";
import { quoteSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = quoteSchema.parse(payload);

    console.log("[Quote Create] payload received, services:", parsed.services?.length);

    const record = await createQuoteLead(parsed);

    console.log("[Quote Create] created ID:", record.id, "| createdAt:", record.createdAt);

    return NextResponse.json({
      success: true,
      id: record.id,
      createdAt: record.createdAt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Quote Create] FAILED:", msg);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to create quote",
      },
      { status: 400 },
    );
  }
}
