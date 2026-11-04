// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const created: Array<Record<string, unknown>> = [];
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    leadEvent: {
      findFirst: async () => null,
      findMany: async () => [],
      create: async ({ data }: { data: Record<string, unknown> }) => {
        created.push(data);
        return { id: `le-${created.length}`, ...data };
      },
    },
    quoteLead: { findUnique: async () => null },
  },
}));

const sms: Array<{ to: string; body: string }> = [];
vi.mock("./deposit-link", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./deposit-link")>()),
  sendSms: async (to: string, body: string) => {
    sms.push({ to, body });
    return { ok: true, sid: "SM1" };
  },
}));

vi.mock("./caller-lookup", async (importOriginal) => {
  const real = await importOriginal<typeof import("./caller-lookup")>();
  return { ...real, lookupCallerByPhone: async () => ({ ...real.UNKNOWN_CALLER, known: true, firstName: "Chris", fullName: "Chris Smith" }) };
});

const URL_ = "https://api.everdoer.com/api/twilio/sms/inbound";
const OWNER = "+17055550000";
const TOKEN = "test-auth-token";
const posts: Array<{ url: string; headers: Record<string, string>; body: string }> = [];
let respond: () => Response = () => new Response("<Response/>", { status: 200 });

const twilioParams = (over: Record<string, string> = {}) => ({
  ToCountry: "CA",
  SmsMessageSid: "SM123",
  NumMedia: "0",
  From: "+14165550101",
  To: "+17059962001",
  Body: "How much to shrink wrap a 22 ft bowrider?",
  MessageSid: "SM123",
  AccountSid: "AC123",
  ApiVersion: "2010-04-01",
  ...over,
});

beforeEach(() => {
  created.length = 0;
  sms.length = 0;
  posts.length = 0;
  respond = () => new Response("<Response/>", { status: 200 });
  vi.stubEnv("DATABASE_URL", "postgres://test");
  vi.stubEnv("OWNER_SMS_NUMBER", OWNER);
  vi.stubEnv("TWILIO_AUTH_TOKEN", TOKEN);
  vi.stubEnv("EVERDOER_SMS_FORWARD_URL", URL_);
  vi.stubEnv("RETELL_API_KEY", "");
  vi.stubGlobal("fetch", async (url: string, init: { headers: Record<string, string>; body: string }) => {
    posts.push({ url, headers: init.headers, body: init.body });
    return respond();
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("forwarding A1's customer texts to Everdoer", () => {
  it("signs exactly like Twilio (same as the inbound check)", async () => {
    const { signForTwilio } = await import("./everdoer-forward");
    const { twilioSignatureFor } = await import("./inbound-sms");
    const p = twilioParams();
    expect(signForTwilio(URL_, p, TOKEN)).toBe(twilioSignatureFor(URL_, p, TOKEN));
  });

  it("a customer's text goes to Everdoer with every Twilio field and a valid signature; nothing is relayed or acked here", async () => {
    const { handleInboundSms, verifyTwilioSignature } = await import("./inbound-sms");
    const p = twilioParams();
    const res = await handleInboundSms(p);
    expect(res).toMatchObject({ forwarded: true, relayed: false, acked: false });
    expect(posts).toHaveLength(1);
    expect(posts[0].url).toBe(URL_);
    const sent = Object.fromEntries(new URLSearchParams(posts[0].body));
    expect(sent).toEqual(p);
    expect(verifyTwilioSignature([URL_], sent, posts[0].headers["x-twilio-signature"], TOKEN)).toBe(true);
    expect(sms).toHaveLength(0);
    expect(created[0]).toMatchObject({ phone: "+14165550101", message: p.Body, metadata: expect.objectContaining({ forwarded: true }) });
  });

  it("photos and STOP / START are forwarded too (Everdoer keeps the consent records)", async () => {
    const { handleInboundSms } = await import("./inbound-sms");
    expect((await handleInboundSms(twilioParams({ Body: "", NumMedia: "1", MediaUrl0: "https://api.twilio.com/m/1", MediaContentType0: "image/jpeg" }))).forwarded).toBe(true);
    expect((await handleInboundSms(twilioParams({ Body: "STOP" }))).forwarded).toBe(true);
    expect(posts).toHaveLength(2);
    expect(Object.fromEntries(new URLSearchParams(posts[0].body)).MediaUrl0).toBe("https://api.twilio.com/m/1");
  });

  it("Marcus's own texts stay here (his call approvals) and are never forwarded", async () => {
    const { handleInboundSms } = await import("./inbound-sms");
    const res = await handleInboundSms(twilioParams({ From: OWNER, Body: "thanks" }));
    expect(res.reason).toBe("owner");
    expect(posts).toHaveLength(0);
  });

  it("if Everdoer can't take it, the old relay + ack run so the text isn't lost", async () => {
    const { handleInboundSms } = await import("./inbound-sms");
    respond = () => new Response("down", { status: 503 });
    const res = await handleInboundSms(twilioParams({ Body: "Can you call me about my boat?" }));
    expect(posts).toHaveLength(1);
    expect(res.forwarded).toBeUndefined();
    expect(res.relayed).toBe(true);
    expect(sms.find((m) => m.to === OWNER)?.body).toContain("Can you call me about my boat?");
    expect(sms.some((m) => m.to === "+14165550101")).toBe(true); // the customer's ack
  });

  it("forwarding off (no EVERDOER_SMS_FORWARD_URL, or not https): exactly as before", async () => {
    const { handleInboundSms } = await import("./inbound-sms");
    vi.stubEnv("EVERDOER_SMS_FORWARD_URL", "");
    const res = await handleInboundSms(twilioParams());
    expect(res.relayed).toBe(true);
    vi.stubEnv("EVERDOER_SMS_FORWARD_URL", "http://api.everdoer.com/api/twilio/sms/inbound");
    await handleInboundSms(twilioParams({ MessageSid: "SM124" }));
    expect(posts).toHaveLength(0);
    // A photo-only text with forwarding off is still ignored, as before.
    vi.stubEnv("EVERDOER_SMS_FORWARD_URL", "");
    expect((await handleInboundSms(twilioParams({ Body: "", NumMedia: "1" }))).reason).toBe("empty");
  });
});
