// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  bookingRequest: { findMany: vi.fn() },
  quoteLead: { findMany: vi.fn() },
  leadEvent: { findMany: vi.fn() },
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: db }));

import { exportForEmpireVu } from "../../scripts/export-for-empirevu";

const now = new Date("2026-09-28T14:00:00Z");
const oldQuote = {
  id: "old-quote", createdAt: new Date("2026-05-01T14:00:00Z"),
  contactName: "Dana Lee", contactEmail: "dana@example.com", contactPhone: "7055551234",
  boatLength: "24", boatType: "bowrider", services: ["Shrink Wrapping"], addons: [],
  locationSlug: "midland", notes: null, estimatedTotal: 67200n,
  requiresManualReview: false, metadata: { formType: "shrink-wrap-quote" },
};
const booking = {
  id: "booking-1", createdAt: oldQuote.createdAt, quoteId: oldQuote.id,
  serviceSlug: "shrink-wrapping", locationSlug: "midland", date: "2026-10-10", timeSlot: "09:00",
  contactName: oldQuote.contactName, contactEmail: oldQuote.contactEmail,
  contactPhone: oldQuote.contactPhone, notes: null, status: "pending", metadata: {},
};
const payment = {
  leadId: oldQuote.id, createdAt: new Date("2026-05-01T14:05:00Z"),
  metadata: { quoteId: oldQuote.id, stripeSessionId: "cs_old", depositCents: 25000 },
  rawPayload: { session: { id: "cs_old", amount_total: 25000 } },
};

beforeEach(() => {
  vi.resetAllMocks();
  db.bookingRequest.findMany.mockResolvedValue([booking]);
  db.quoteLead.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([oldQuote]);
  // Model the old date filter so this regression fails if it is reintroduced.
  db.leadEvent.findMany.mockImplementation(async ({ where }) =>
    where.createdAt?.gte > payment.createdAt ? [] : [payment]);
});

describe("EmpireVu export", () => {
  it("preserves an old paid deposit for an upcoming booking, with its actual amount", async () => {
    const result = await exportForEmpireVu(now);
    expect(result.bookings[0].quoteId).toBe(oldQuote.id);
    expect(result.quotes[0]).toMatchObject({
      id: oldQuote.id, estimatedTotalCents: 67200,
      deposit: { paidAt: payment.createdAt.toISOString(), stripeSessionId: "cs_old", amountCents: 25000 },
    });
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it("matches payments saved with only metadata.quoteId and reads the nested Stripe amount", async () => {
    db.leadEvent.findMany.mockResolvedValue([{
      ...payment, leadId: null,
      metadata: { quoteId: oldQuote.id, stripeSessionId: "cs_old" },
    }]);
    const result = await exportForEmpireVu(now);
    expect(result.quotes[0].deposit?.amountCents).toBe(25000);
    expect(db.leadEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        leadType: "shrink-wrap-deposit",
        OR: [
          { leadId: { in: [oldQuote.id] } },
          { metadata: { path: ["quoteId"], equals: oldQuote.id } },
        ],
      },
    }));
  });

  it("retains the first paid record when a payment was delivered twice", async () => {
    db.leadEvent.findMany.mockResolvedValue([payment, { ...payment, createdAt: now }]);
    const result = await exportForEmpireVu(now);
    expect(result.quotes[0].deposit?.paidAt).toBe(payment.createdAt.toISOString());
    expect(db.leadEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { createdAt: "asc" } }));
  });

  it("exports an unpaid quote without inventing a deposit", async () => {
    db.leadEvent.findMany.mockResolvedValue([]);
    expect((await exportForEmpireVu(now)).quotes[0].deposit).toBeNull();
  });

  it("does not query unrelated payments when there are no quotes or bookings", async () => {
    db.bookingRequest.findMany.mockResolvedValue([]);
    const result = await exportForEmpireVu(now);
    expect(result.quotes).toEqual([]);
    expect(result.bookings).toEqual([]);
    expect(db.leadEvent.findMany).not.toHaveBeenCalled();
  });
});
