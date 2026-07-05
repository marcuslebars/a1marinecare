// Durable, append-only server-side log of every lead submission — a recoverable
// record that does not depend on the database, email, or CRM webhook. Writing a
// record here is the gate for reporting success to the customer.
import fs from "node:fs";
import path from "node:path";

export function leadLogDir(): string {
  return (
    process.env.LEAD_LOG_DIR ??
    process.env.QUOTE_LOG_DIR ??
    path.resolve(process.cwd(), ".lead-submissions")
  );
}

/** Append a lead record as one JSONL line. Throws if the write fails. */
export function appendLeadRecord(record: Record<string, unknown>): void {
  const dir = leadLogDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  fs.appendFileSync(path.join(dir, `leads-${month}.jsonl`), `${JSON.stringify(record)}\n`, "utf-8");
}
