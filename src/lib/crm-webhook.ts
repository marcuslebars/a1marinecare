/**
 * CRM Webhook Helper
 * Fires a non-blocking POST to the A1 Marine Care CRM (leads.a1marinecare.ca)
 * whenever a contact, booking, or quote form is submitted on a1marinecare.ca.
 *
 * The call is intentionally fire-and-forget: it never delays the form response
 * and a failure here never breaks the user-facing flow.
 */

const CRM_WEBHOOK_BASE = process.env.CRM_WEBHOOK_URL ?? "https://leads.a1marinecare.ca";
const CRM_WEBHOOK_SECRET = process.env.CRM_WEBHOOK_SECRET ?? "";

type ContactWebhookPayload = {
  source: "contact";
  name: string;
  email: string;
  phone?: string;
  service?: string;
  message?: string;
  marina?: string;
};

type BookingWebhookPayload = {
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

type QuoteWebhookPayload = {
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

/**
 * Sends a lead payload to the CRM webhook endpoint.
 * This is fire-and-forget — errors are logged but never thrown.
 */
export function sendToCrm(payload: CrmWebhookPayload): void {
  const endpoint = `${CRM_WEBHOOK_BASE}/api/webhook/${payload.source}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (CRM_WEBHOOK_SECRET) {
    headers["x-webhook-secret"] = CRM_WEBHOOK_SECRET;
  }

  // Fire and forget — do not await
  fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  })
    .then((res) => {
      if (!res.ok) {
        res.text().then((body) => {
          console.error(`[CRM Webhook] ${payload.source} → ${res.status}: ${body}`);
        });
      } else {
        console.log(`[CRM Webhook] ${payload.source} → sent OK (${res.status})`);
      }
    })
    .catch((err) => {
      console.error(`[CRM Webhook] ${payload.source} → fetch failed:`, err instanceof Error ? err.message : String(err));
    });
}
