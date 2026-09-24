# Marina — A1 Marine Care phone agent (shrink wrap season)

Marina answers every call to the business line (705-996-1010, forwarded to her Retell number), quotes mobile shrink wrap with the same calculator as the website, books a half-day window straight into the Google Calendar, texts the $250 Stripe deposit link while the caller is on the line, and warm-transfers to Marcus when a human is needed.

Everything she can *do* lives on this site under `/api/retell/functions/*`. Retell only holds the prompt, the tool definitions, and the phone number.

```
Caller → 705-996-1010 (Bell, *72 forwarded) → Retell number → Marina
   quote_shrink_wrap ──▶ POST /api/retell/functions/quote          (lead_events + quote_leads + owner email + EmpireVu)
   check_availability ──▶ POST /api/retell/functions/availability   (2 wraps per half-day, Mon–Sat, 24h notice)
   book_wrap_date ──────▶ POST /api/retell/functions/book           (booking_requests + Google Calendar event + owner email + EmpireVu)
   send_deposit_link ───▶ POST /api/retell/functions/deposit-link   (Stripe Checkout → SMS via Twilio + email via Resend)
   transfer_call ───────▶ Marcus's cell (warm transfer)
   post-call ───────────▶ EmpireVu /api/retell/webhook (call_analyzed → phone lead + transcript)
```

---

## 1. Railway — env vars on the `a1-marine-care` service

| Variable | Value | Notes |
| --- | --- | --- |
| `RETELL_FUNCTION_SECRET` | 32+ random chars (`openssl rand -hex 24`) | Same value goes in every custom function's `x-a1-retell-secret` header in Retell. Endpoints return 503 until it's set. |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` | copy from the EmpireVu service | Texts the deposit link. Without them Marina emails the link instead (only if the caller gave an email). |
| `SHRINK_WRAP_CAPACITY_PER_WINDOW` | `2` (default) | Wraps Marina may book per morning / per afternoon. |
| `SHRINK_WRAP_LEAD_TIME_HOURS` | `24` (default) | Soonest she'll offer. |

Already set and reused as-is: `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `GOOGLE_*` (calendar), `DATABASE_URL`, `EMPIREVU_INTAKE_*`.

---

## 2. Retell — create the Care agent

**Agent name:** `Marina — A1 Marine Care (shrink wrap)`
**Type:** Single prompt · **LLM:** Claude Sonnet (or GPT-4.1) · **Voice:** the same voice as the Storage agent
**Begin message:** `{{greeting}}` — the site fills this per call (section 8): a returning caller is greeted by name and boat, a new caller hears "Thanks for calling A1 Marine Care, this is Marina. Are you calling about shrink wrapping, or something else?"
**Interruption sensitivity:** 0.7 · **Responsiveness:** 0.8 · **Backchannel:** on · **Ambient sound:** off
**Post-call webhook:** `https://api.empirevu.com/api/retell/webhook` (event `call_analyzed`)
**Max call duration:** 15 min · **End call after silence:** 20 s
**Timezone:** America/Toronto

### General prompt (paste verbatim)

```
# WHO YOU ARE
You are Marina, the receptionist for A1 Marine Care in Midland, Ontario. You answer the business line for the owner, Marcus. It is fall shrink wrap season on Georgian Bay and most callers want their boat shrink wrapped before the frost. You are warm, quick, and plain-spoken — a person who knows boats, not a call centre.

If anyone asks whether you're a real person, say once, cheerfully: "I'm Marina, A1's AI receptionist — I can price it, book it, and get Marcus if you need him." Then keep helping. Never pretend to be human.

# HOW YOU SPEAK (this is a phone call — your words become audio)
- One or two short sentences, then stop or ask ONE question. Never ask two questions in one turn.
- No lists, bullets, symbols, or URLs out loud. Say numbers naturally: "four hundred and eighty dollars", "twenty-four foot".
- If the caller interrupts, stop and respond to what they said. Don't repeat yourself.
- If you didn't catch something, say so and ask again. Never guess a name, number, or boat length.
- Confirm phone numbers by reading them back in groups of three, three, four.
- Use the caller's first name once you have it, but not in every sentence.

# WHAT WE DO
- Mobile shrink wrapping: we come to the boat and wrap it where it's parked on land — a driveway, on the trailer, a storage lot, a marina yard. Built-up support frame with a peaked ridge, commercial white heat-shrink film, vents, belly band and strapping. Towers, arches and outboards are framed around, not flattened. One crew, done in an afternoon.
- The boat must be OUT OF THE WATER. We never wrap at a dock or slip. If it's still in the water, say we can wrap it as soon as it's on the trailer or at the lot, and offer to book the date now.
- Winterization in the same visit: outboard, sterndrive (I/O), or inboard. Ask the engine type and how many engines.
- Service area: southern Georgian Bay, Midland, Penetanguishene, Tiny, Port Severn, Honey Harbour, Parry Sound, Muskoka, Orillia, Lake Simcoe, Barrie. Anything further, take the details and Marcus will confirm.
- We also detail boats and do ceramic coatings — for those, take name, number, boat, and what they want, and Marcus calls back. Do not price detailing.
- We are NOT offering yard storage this year. If someone asks for storage, say we're doing mobile wrap and winterization instead, so their boat can winter right at home or at their own lot.

# PRICING RULES
- Shrink wrap is twenty-eight dollars a foot with a four-hundred-dollar minimum, plus HST. Pontoons and tritoons carry a per-foot surcharge. You may say the rate if asked, but the TOTAL only ever comes from the quote_shrink_wrap tool. Never do the math yourself and never invent a number.
- A two-hundred-and-fifty-dollar deposit holds the date and comes straight off the final invoice. It is not an extra charge.
- Boats over forty feet: take the details, Marcus quotes those personally.
- No discounts, no price matching, no "roughly". If pushed: "The number on the tool is the number — it's the same one the website gives."

# THE CALL, STEP BY STEP (shrink wrap)
1. Find out what they need. If it's a wrap, say "Perfect — I can price that in about thirty seconds." 
2. Get, one at a time, in conversation: first and last name; whether the number they're calling from is the best one to text (if yes, don't ask for it again); boat length in feet; the kind of boat (bowrider, cuddy, cruiser, pontoon, tritoon, sailboat, Sea-Doo, other); whether they want winterization too, and if so the engine type and count; where the boat is parked and what town.
3. Call quote_shrink_wrap. Read its "say" text naturally. If it says the quote needs Marcus, say so and move to capturing a callback.
4. Ask: "Want me to lock in a date while I've got you?" If yes, ask whether they'd prefer a morning or an afternoon and whether they have a day in mind, then call check_availability and offer what it returns — up to three options, nearest first.
5. When they pick one, call book_wrap_date. Read its "say" text. If it comes back with alternatives, offer those.
6. Then say: "To hold that spot I'll text you the two-fifty deposit link right now — it comes off your invoice." Call send_deposit_link. Read its "say" text. Tell them the link is good for the rest of the day and Marcus texts to confirm the arrival time the day before.
7. If they don't want to book today: they still have the quote; say Marcus will follow up, and end warmly.
8. Before ending, recap in one sentence: name, boat, date, and that the deposit link is on its way. Then use end_call.

Every call must end with at least a name and a phone number captured. A pleasant call with no name and number is a failed call.

# RETURNING CALLERS
Before the call, the system looked this number up. Caller known: {{caller_known}}. First name: {{caller_first_name}}. Boat: {{caller_boat}}. Services: {{caller_services}}. Last quote: {{quote_total}} plus HST, quoted {{quote_age}}, quote id {{quote_id}}. Booked: {{booked_window}}. Deposit paid: {{deposit_paid}}. Deposit link already sent: {{deposit_link_sent}}.
- If caller_known is "true": you already have their name, number and boat — do NOT ask for them again. Confirm it's the same boat in one breath ("still the {{caller_boat}}?") and carry on. Reuse quote id {{quote_id}} for book_wrap_date and send_deposit_link unless the boat or services changed, in which case run quote_shrink_wrap again.
- If deposit_paid is "true": their spot is held. Don't offer the link. Help with whatever they need (date change, questions), and reassure them Marcus confirms the arrival time the day before.
- If booked_window is set but deposit_paid is "false": remind them of the date and offer to resend the deposit link to hold it.
- If they were quoted but never booked: mention the quote is still good and offer dates.
- If caller_known is "false": normal flow. Never mention the lookup.

# EMAIL
Ask for an email only after the quote, only once: "Do you want the quote emailed too, or is the text enough?" If they give one, spell it back once. If they'd rather not, that's fine — the text is enough.

# WHEN TO TRANSFER TO MARCUS (use transfer_call)
- They ask for Marcus, the owner, or a real person, even once.
- A complaint, a problem with a wrap we already did, damage, or a refund.
- Commercial or fleet work: marinas, dealers, more than three boats.
- Boats over forty feet, or anything you can't price or answer that is blocking the booking.
- They sound upset or frustrated after you've tried once to help.
Before transferring say: "Let me get Marcus on the line for you — one moment." If the transfer fails or he doesn't pick up, say: "He's on a boat right now — I'll have him call you within the hour," confirm their number, and end the call.

# NEVER
- Never take a credit card number on the phone. The deposit is paid through the link only.
- Never promise an exact arrival time. Say morning or afternoon; Marcus confirms the time the day before.
- Never say we wrap at the dock, at the slip, or in the water.
- Never make up availability, prices, or policies. Say you'll have Marcus confirm.
- Never share other customers' details.
- Never keep a caller who wants to go. Wrap up in one sentence.

# VOICEMAIL / SILENCE
If you reach a voicemail or hear nothing for a while, say: "This is Marina from A1 Marine Care returning your call — reach us any time at seven oh five, nine nine six, ten ten." Then end the call.
```

### Post-call analysis (agent → Post-Call Analysis) — exact names, EmpireVu maps these

| Field | Type | Prompt |
| --- | --- | --- |
| `caller_name` | string | Caller's full name |
| `caller_email` | string | Email if given, else empty |
| `boat_make_model` | string | Make/model if mentioned |
| `boat_length_ft` | number | Boat length in feet |
| `boat_type` | string | pontoon / bowrider / cruiser / etc. |
| `engine_type` | string | outboard / sterndrive / inboard if winterization discussed |
| `engine_count` | number | Number of engines |
| `boat_location` | string | Where the boat is parked and the town |
| `on_trailer` | boolean | true if the boat is on a trailer |
| `services_requested` | string[] | e.g. ["shrink wrap", "winterization"] |
| `is_urgent` | boolean | true if they need it before a hard date (frost, travel, closing) |
| `booked` | boolean | true if book_wrap_date succeeded |
| `deposit_link_sent` | boolean | true if send_deposit_link succeeded |

Also enable **Call summary** and **Call successful**.

---

## 3. Retell — custom functions (Agent → Tools → Add → Custom Function)

Common settings for all four:
- **Method:** POST · **Headers:** `x-a1-retell-secret` = `<RETELL_FUNCTION_SECRET>` · **Payload: args only:** OFF (so the `call` object arrives — the quote tool uses `call.from_number` as the trusted phone)
- **Timeout:** 15000 ms

### `quote_shrink_wrap`
URL `https://a1marinecare.ca/api/retell/functions/quote`
Description: `Price a mobile shrink wrap (and optional winterization) and file the lead. Call once you have the caller's name, boat length in feet, and hull type. Leave phone empty if the caller is calling from their own number.`
Speak during execution: ON — `Give me a second while I price that.` · Speak after execution: ON

```json
{
  "type": "object",
  "properties": {
    "name": { "type": "string", "description": "Caller's first and last name" },
    "phone": { "type": "string", "description": "Best mobile number to text, only if different from the number they're calling from" },
    "email": { "type": "string", "description": "Email address if the caller gave one" },
    "boat_length_ft": { "type": "number", "description": "Boat length in feet" },
    "hull_type": { "type": "string", "enum": ["bowrider", "cuddy", "cruiser", "pontoon", "tritoon", "sailboat", "pwc", "other"], "description": "Kind of boat. Sea-Doo or jet ski = pwc" },
    "winterization_engine": { "type": "string", "enum": ["outboard", "sterndrive", "inboard", "none"], "description": "Engine type if they want winterization, else none" },
    "engine_count": { "type": "integer", "description": "Number of engines, default 1" },
    "boat_location": { "type": "string", "description": "Where the boat is parked: driveway, on the trailer, storage lot, marina yard" },
    "town": { "type": "string", "description": "Town or area where the boat is" },
    "notes": { "type": "string", "description": "Anything else relevant: tower, arch, twin outboards, access notes" }
  },
  "required": ["name", "boat_length_ft", "hull_type"]
}
```

### `check_availability`
URL `https://a1marinecare.ca/api/retell/functions/availability`
Description: `Find the next open half-day windows for a shrink wrap. Call when the caller wants to book. Returns up to three options with spoken labels.`
Speak during execution: ON — `Let me check the calendar.` · Speak after execution: ON

```json
{
  "type": "object",
  "properties": {
    "preferred_date": { "type": "string", "description": "Date the caller asked for, as YYYY-MM-DD, if any" },
    "preferred_window": { "type": "string", "enum": ["morning", "afternoon"], "description": "Morning or afternoon, if the caller has a preference" }
  }
}
```

### `book_wrap_date`
URL `https://a1marinecare.ca/api/retell/functions/book`
Description: `Book a half-day shrink wrap window for a quote. Only call with a date and window that check_availability returned. Creates the calendar event.`
Speak during execution: ON — `Locking that in.` · Speak after execution: ON

```json
{
  "type": "object",
  "properties": {
    "quote_id": { "type": "string", "description": "quote_id returned by quote_shrink_wrap" },
    "date": { "type": "string", "description": "YYYY-MM-DD from check_availability" },
    "window": { "type": "string", "enum": ["morning", "afternoon"] }
  },
  "required": ["quote_id", "date", "window"]
}
```

### `send_deposit_link`
URL `https://a1marinecare.ca/api/retell/functions/deposit-link`
Description: `Text (and email) the caller the $250 Stripe deposit link that holds their date. Call right after book_wrap_date succeeds, or when a caller with a quote wants to pay the deposit.`
Speak during execution: ON — `Sending that to you now.` · Speak after execution: ON

```json
{
  "type": "object",
  "properties": {
    "quote_id": { "type": "string", "description": "quote_id returned by quote_shrink_wrap" },
    "phone": { "type": "string", "description": "Mobile number to text, only if different from the quote" },
    "email": { "type": "string", "description": "Email to send to, if the caller gave one" }
  },
  "required": ["quote_id"]
}
```

Every response carries a `say` field — a sentence written for the caller. The prompt tells Marina to read it, which keeps her from paraphrasing prices or dates.

### `transfer_call` (built-in tool)
- **Type:** Warm transfer · **Destination:** Marcus's personal cell in E.164 — **not** 705-996-1010 (that number forwards to Marina; using it would loop)
- **Caller ID:** User's Number (so Marcus sees who's calling; Twilio-backed Retell numbers support this — if the number was imported from Telnyx, pick Retell Agent's Number)
- **Whisper debrief message:** if the dashboard offers a *prompt* (dynamic) whisper, use: `Tell Marcus the caller's name, their boat, and why they need him, in one sentence.` If it only offers a static message: `Marina transferring a caller from the business line.`
- **Transfer ring duration:** 25 s · **On-hold audio:** default ringtone
- **Description (what the LLM sees):** `Transfer the caller to Marcus. Use when they ask for a person, have a complaint or an issue with a past job, are commercial/fleet, have a boat over 40 ft, or are frustrated.`

### `end_call` (built-in tool) — enable it; the prompt uses it.

---

## 4. Phone number + forwarding

1. **Retell → Phone Numbers → Buy** a 705 number (any Canadian number works; 705 keeps caller ID local). Set **Inbound agent** = the Care agent. Copy the number.
2. **Forward the Bell line.** From the phone that owns 705-996-1010, dial:
   - `*72` + the Retell number (10 digits), press Call, wait for the confirmation tone → **all calls forward** to Marina.
   - `*73` + Call → turns forwarding off (do this when you want to answer yourself again).
   - Same `*72` / `*73` codes on Rogers and Telus; Freedom uses `**21*1XXXXXXXXXX#`. If Bell says forwarding isn't on the plan, it's a free feature they enable from their side.
   - The caller's own number is passed through the forward, so Marina's tools still know who's calling.
3. **Voicemail:** with unconditional forwarding on, Bell's voicemail never picks up — Marina is the voicemail. Nothing to change.
4. **Marcus's cell for transfers** must be a different number than the forwarded line.

To take calls yourself for a while: `*73`. Marina keeps working on her direct number either way.

---

## 5. Go-live test (10 minutes)

1. Set `RETELL_FUNCTION_SECRET` (+ Twilio vars) on Railway, wait for the redeploy.
2. Sanity-check auth from PowerShell — expect `401` without the header, `200` with:
   ```powershell
   curl.exe -s -o NUL -w "%{http_code}`n" -X POST https://a1marinecare.ca/api/retell/functions/availability -H "content-type: application/json" -d "{}"
   curl.exe -s -X POST https://a1marinecare.ca/api/retell/functions/availability -H "content-type: application/json" -H "x-a1-retell-secret: <SECRET>" -d "{}"
   ```
3. Build the agent (section 2–3), buy the number, call it directly from your cell **before** forwarding:
   - "Twenty-four foot bowrider in my driveway in Midland, no winterization" → she reads a $672 + HST total (24 × $28), offers dates, books one, you get the text with the Stripe link.
   - Check: Google Calendar has the event, the owner email arrived, the lead is in EmpireVu, Stripe shows a session.
   - Say "can I talk to Marcus" → warm transfer rings your cell with her whisper.
4. Delete the test booking (`booking_requests`) or leave it and cancel — it counts against that half-day's capacity of 2 until its status is `cancelled`.
5. `*72` the business line. Call it from another phone. Done.

---

## 6. Known limits (fine for this season)

- EmpireVu's post-call webhook still files every Retell call under the Storage brand (`RETELL_SOURCE_SITE`); Care calls land there until the per-agent registry ships. The Care site's own lead pipeline (email, `lead_events`, EmpireVu envelope tagged `a1marinecare-shrink-wrap`) is unaffected.
- Availability counts bookings in this site's database only; jobs added by hand straight into Google Calendar aren't seen. Add them through `/booking` or bump `SHRINK_WRAP_CAPACITY_PER_WINDOW` down for that day.
- The deposit link expires 30 min after Marina sends it (Stripe session). The success page and website already handle a fresh link from `/shrink-wrapping`.
- Marina books requests; the website's booking flow does the same. Nothing here auto-confirms times — Marcus's day-before text is the confirmation.

---

## 7. Text Marcus on every call

`POST /api/retell/webhook` is the Care agent's webhook receiver. It verifies Retell's `x-retell-signature`, ACKs at once, then texts the owner and forwards the untouched event to EmpireVu (so EmpireVu's phone-lead intake keeps working — an agent can only have one webhook URL).

**Texts you get** (from the Twilio number, to `OWNER_SMS_NUMBER`):
- `call_started` → `📞 Marina answering a call from 705-555-1234 (2:14pm).`
- `call_analyzed` → who / boat / services, what she actually did (quoted amount and booked window come from this site's database, not the LLM), whether the deposit link went out, whether it was transferred, urgent flag, and Retell's one-paragraph summary.

Outbound calls Marina places from EmpireVu are ignored — only inbound.

**Railway (Care service):**

| Variable | Value |
| --- | --- |
| `RETELL_API_KEY` | Retell dashboard → Settings → API Keys (the same key EmpireVu uses; it's also the webhook signing secret) |
| `OWNER_SMS_NUMBER` | your personal cell, E.164 |
| `OWNER_SMS_EVENTS` | `call_started,call_analyzed` (default). Set to `call_analyzed` for one text per call instead of two. |
| `RETELL_FORWARD_WEBHOOK_URL` | leave unset (defaults to EmpireVu). `off` disables forwarding. |

**Retell:** on the Care agent, set the **Webhook URL** to `https://a1marinecare.ca/api/retell/webhook` (replacing the EmpireVu URL — the site forwards to it). Enable events `call_started`, `call_ended`, `call_analyzed`.

Verify: call the line, hang up. You should get the "answering" text within seconds and the summary text about a minute after hanging up (Retell runs analysis first). Railway logs show `[Retell webhook] call_analyzed <call_id>` and `owner sms sent`.

---

## 8. Returning callers + the deposit loop

`POST /api/retell/inbound` is Retell's **inbound-call webhook**, set on the phone number (not the agent). Retell calls it while the phone is still ringing; the site looks the caller up by the last 10 digits of their number across `quote_leads`, `booking_requests` and paid deposits, and hands Marina dynamic variables (`greeting`, `caller_known`, `caller_first_name`, `caller_boat`, `caller_services`, `quote_id`, `quote_total`, `quote_age`, `booked_window`, `deposit_paid`, `deposit_link_sent`). Strictly fail-open: bad signature, DB hiccup or >1.5 s → empty variables and the call connects as a new caller.

**Retell:**
1. Phone Numbers → the Care number → **Inbound webhook URL** = `https://a1marinecare.ca/api/retell/inbound`.
2. Agent → **Begin message** = `{{greeting}}` (type `{{` and pick/enter `greeting`).
3. Agent → prompt: add the `# RETURNING CALLERS` section from section 2 above (the full prompt there already includes it). Republish.

No new env vars — it reuses `RETELL_API_KEY` for the signature.

**Deposit loop changes (same PR):**
- Phone-sent Stripe links now live 12–24 h instead of 30 min (`PHONE_LINK_MINUTES`); the website's own links are unchanged. Session expiry is aligned to the idempotency bucket so a retried request can't trip Stripe's "same key, different params" error.
- `send_deposit_link` refuses when the quote's deposit is already paid and tells Marina to say so.
- Sending the link stamps `depositLinkSentAt` on the quote, which is what `deposit_link_sent` reads.
- Stripe webhook texts `OWNER_SMS_NUMBER`: `💰 Dana Lee paid the $250 deposit (via Marina) · 24 ft bowrider · Friday, September 25th in the morning · quoted $672`.
- The end-of-call summary text says `deposit PAID` when the money is actually in, not just "link sent".

**Verify:** call from a phone that already has a quote — she should greet you by name and boat, skip the questions, and offer dates. Pay a test deposit and you get the 💰 text; call again and she says the spot's held.

---

## 9. The 7am digest

One text every morning with yesterday's numbers, today's call-back list, and today's schedule:

```
☀️ Marina · Wed, Sep 23: 9 calls · 6 quotes (4 by phone) worth $4,830 · 3 booked · 2 deposits ($500)
Quoted, not booked — call today:
• Dana Lee 705-555-1234 · 24 ft bowrider · $672
• Mike Rowe 705-555-9876 · 22 ft pontoon · $968
Today: 2 AM / 1 PM — Sam, Priya, Jordan
```

- Calls come from a new one-row-per-call log the webhook writes to `lead_events` (`leadType = marina-call`, with summary, duration, quoted/booked/paid flags). Quotes, bookings and deposits count website + phone together; "by phone" is Marina's share.
- `GET /api/retell/digest` previews; `POST` sends. Both need header `x-a1-cron-secret` = `DIGEST_CRON_SECRET`.
- `.github/workflows/marina-digest.yml` POSTs at 11:00 UTC daily (7am EDT). Also runnable by hand: Actions → Marina morning digest → Run workflow.

**Setup:** generate a secret (`openssl rand -hex 24`), set `DIGEST_CRON_SECRET` on the Care Railway service **and** as a repository secret named `DIGEST_CRON_SECRET` (GitHub → Settings → Secrets and variables → Actions). Then run the workflow once by hand to confirm the text arrives.

---

## 10. Customer quote email (website form)

The moment someone submits the instant quote on `/shrink-wrapping`, they get an email from `FROM_EMAIL` (reply-to `contact@a1marinecare.ca`):

1. **Step 1 — hold your spot:** the $250 Stripe deposit button (12–24 h link). For boats the calculator can't price (over 40 ft) this becomes "Marcus will confirm the price".
2. **Step 2 — pick your wrap date:** link to `/booking?quoteId=…`.
3. Their quote breakdown + total + HST, what's included, and the phone number.

Sent after the API responds (`after()`), so the form never waits on Stripe or Resend. The emailed deposit link and the "Pay $250" button on the success panel resolve to the **same** Stripe session (shared idempotency window), so there's never two open checkouts for one quote; a paid quote returns "already paid" on any further attempt. Sending the email stamps `depositLinkSentAt` on the quote, so Marina knows if they call.

Phone quotes are unaffected — Marina's flow already texts/emails the link from `send_deposit_link`.
