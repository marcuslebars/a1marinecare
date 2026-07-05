import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// Avoid the real DB (Prisma) and network — the handler only uses these three.
vi.mock("@/lib/lead-events", () => ({
  createLeadEvent: vi.fn(async () => ({ id: "lead_test" })),
  sendLeadNotificationEmail: vi.fn(async () => ({ success: true })),
  isMissingTableError: () => false,
}));
vi.mock("@/lib/crm-webhook", () => ({ sendToCrm: vi.fn() }));

import { handleContactSubmission } from "@/lib/contact-handler";
import { sendToCrm } from "@/lib/crm-webhook";

const TMP = path.join(os.tmpdir(), "a1-care-contact-test");

const validBody = {
  fullName: "Jane Doe",
  email: "jane@example.com",
  phone: "705-555-1234",
  subject: "Ceramic coating question",
  serviceInterest: "ceramic-coating",
  message: "Hi, I'd like a quote for ceramic coating on my 24ft boat.",
  source: "contact-page",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Marine Care contact handler", () => {
  it("writes a durable a1marinecare-contact record and returns 200", async () => {
    if (fs.existsSync(TMP)) fs.rmSync(TMP, { recursive: true, force: true });
    process.env.LEAD_LOG_DIR = TMP;

    const res = await handleContactSubmission(validBody);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const files = fs.readdirSync(TMP).filter((f) => f.startsWith("leads-"));
    expect(files.length).toBeGreaterThan(0);
    const content = files.map((f) => fs.readFileSync(path.join(TMP, f), "utf-8")).join("");
    expect(content).toContain("a1marinecare-contact");
    expect(content).toContain("jane@example.com");

    // Forwarded to the shared pipeline, tagged distinctly.
    expect(sendToCrm).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendToCrm).mock.calls[0][0].leadTag).toBe("a1marinecare-contact");
  });

  it("rejects an invalid submission with 400 and never forwards", async () => {
    process.env.LEAD_LOG_DIR = TMP;
    const res = await handleContactSubmission({ fullName: "", email: "nope", phone: "1", subject: "x", message: "short", source: "contact-page" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(sendToCrm).not.toHaveBeenCalled();
  });

  it("returns 500 with no fake success when the durable log cannot be written", async () => {
    // Point the log dir under an existing FILE so the directory create/append fails.
    const blocker = path.join(os.tmpdir(), "a1-care-contact-blocker");
    fs.writeFileSync(blocker, "x");
    process.env.LEAD_LOG_DIR = path.join(blocker, "nested");

    const res = await handleContactSubmission(validBody);
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    // Durable write failed → the customer is not told success, and nothing is forwarded.
    expect(sendToCrm).not.toHaveBeenCalled();
  });
});
