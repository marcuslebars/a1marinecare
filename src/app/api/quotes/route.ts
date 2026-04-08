import { NextResponse } from "next/server";

import { createQuoteLead } from "@/lib/leads";
import { quoteSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = quoteSchema.parse(payload);

    const record = await createQuoteLead(parsed);

    return NextResponse.json({
      success: true,
      id: record.id,
      createdAt: record.createdAt,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Unable to create quote",
      },
      { status: 400 },
    );
  }
}
