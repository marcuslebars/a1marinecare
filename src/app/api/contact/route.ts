import { NextResponse } from "next/server";
import { handleContactSubmission } from "@/lib/contact-handler";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request data." }, { status: 400 });
  }

  const { status, body: result } = await handleContactSubmission(body);
  return NextResponse.json(result, { status });
}
