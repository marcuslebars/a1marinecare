/**
 * CRM Webhook Helper
 * Fires a non-blocking POST to the A1 Marine Care CRM (leads.a1marinecare.ca)
 * whenever a contact, booking, or quote form is submitted.
 *
 * The call is intentionally fire-and-forget: it never delays the form response
 * and a failure here never breaks the user-facing flow. It retries a few times
 * on transient failure; the durable server-side lead log is the guaranteed
 * record if every attempt fails.
 */

const CRM_WEBHOOK_BASE = process.env.CRM_WEBHOOK_URL ?? process.env.LEAD_WEBHOOK_URL ?? "https://leads.a1marinecare.ca";
const CRM_WEBHOOK_SECRET = process.env.CRM_WEBHOOK_SECRET ?? process.env.LEAD_WEBHOOK_SECRET ?? "";
const CRM_MAX_ATTEMPTS = 3;

/** Fields shared by every lead payload; sourceSite/leadTag distinguish leads within one pipeline. */
type LeadWebhookBase = {
  sourceSite?: string;
  leadTag?: string;
};

type ContactWebhookPayload = LeadWebhookBase & {
  source: "contact";
  name: string;
  email: string;
  phone?: string;
  service?: string;
  message?: string;
  marina?: string;
};

type BookingWebhookPayload = LeadWebhookBase & {
  source: "booking";
  name: string;
  email: string;
  phone?: string;
  service?: string;
  boatLength?: string;
  marina?: string;
  date?: string;
  timeSlot?: string;
  notes?: string;
};

type QuoteWebhookPayload = LeadWebhookBase & {
  source: "quote";
  name: string;
  email: string;
  phone?: string;
  service?: string;
  boatLength?: string;
  boatType?: string;
  marina?: string;
  notes?: string;
};

type CrmWebhookPayload = ContactWebhookPayload | BookingWebhookPayload | QuoteWebhookPayload;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends a lead payload to the CRM webhook endpoint.
 * Fire-and-forget with retry — errors are logged but never thrown.
 */
export function sendToCrm(payload: CrmWebhookPayload): void {
  const endpoint = `${CRM_WEBHOOK_BASE.replace(/\/+$/, "")}/api/webhook/${payload.source}`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (CRM_WEBHOOK_SECRET) headers["x-webhook-secret"] = CRM_WEBHOOK_SECRET;

  const label = payload.leadTag ?? payload.source;

  void (async () => {
    for (let attempt = 1; attempt <= CRM_MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(payload) });
        if (res.ok) {
          console.log(`[CRM Webhook] ${label} → sent OK (attempt ${attempt}, ${res.status})`);
          return;
        }
        const body = await res.text().catch(() => "");
        console.error(`[CRM Webhook] ${label} → ${res.status} (attempt ${attempt}): ${body}`);
      } catch (err) {
        console.error(`[CRM Webhook] ${label} → fetch failed (attempt ${attempt}):`, err instanceof Error ? err.message : String(err));
      }
      if (attempt < CRM_MAX_ATTEMPTS) await sleep(attempt * 750);
    }
    console.error(`[CRM Webhook] ${label} → gave up after ${CRM_MAX_ATTEMPTS} attempts (durable lead log retains the submission)`);
  })();
}
