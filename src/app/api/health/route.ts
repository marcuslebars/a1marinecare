import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const checks = {
    dbReachable: false,
    quoteLeadsTable: false,
    bookingRequestsTable: false,
    leadEventsTable: false,
    errors: [] as string[],
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.dbReachable = true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    checks.errors.push(`DB unreachable: ${msg}`);
    return NextResponse.json({ status: "unhealthy", checks }, { status: 503 });
  }

  try {
    await prisma.$queryRaw`SELECT 1 FROM "quote_leads" LIMIT 1`;
    checks.quoteLeadsTable = true;
  } catch {
    checks.errors.push("quote_leads table missing. Run: npx prisma migrate deploy");
  }

  try {
    await prisma.$queryRaw`SELECT 1 FROM "booking_requests" LIMIT 1`;
    checks.bookingRequestsTable = true;
  } catch {
    checks.errors.push("booking_requests table missing. Run: npx prisma migrate deploy");
  }

  try {
    await prisma.$queryRaw`SELECT 1 FROM "lead_events" LIMIT 1`;
    checks.leadEventsTable = true;
  } catch {
    checks.errors.push("lead_events table missing. Run: npx prisma migrate deploy");
  }

  const healthy = checks.dbReachable && checks.quoteLeadsTable && checks.bookingRequestsTable && checks.leadEventsTable;

  if (!healthy) {
    console.error("[Health] DB check failed:", checks.errors);
  } else {
    console.log("[Health] DB check passed - all tables present");
  }

  return NextResponse.json(
    { status: healthy ? "healthy" : "unhealthy", checks },
    { status: healthy ? 200 : 503 },
  );
}
