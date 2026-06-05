import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ success: false, error: "Authorization required" }, { status: 401 });
  }

  const ADMIN_PASSWORD = process.env.ADMIN_DASHBOARD_PASSWORD || "a1marinecare2024";
  const expected = `admin:${ADMIN_PASSWORD}`;
  const base64 = authHeader.replace(/^Basic\s+/i, "");
  let authorized = false;
  try {
    const decoded = Buffer.from(base64, "base64").toString("utf-8");
    authorized = decoded === expected;
  } catch {
    authorized = false;
  }

  if (!authorized) {
    return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const toEmail = process.env.CONTACT_TO_EMAIL || process.env.BUSINESS_EMAIL || "contact@a1marinecare.ca";
  const fromEmail = process.env.FROM_EMAIL || "A1 Marine Care <noreply@a1marinecare.ca>";

  try {
    const resend = new Resend(apiKey);
    const response = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: "A1 Marine Care - Test Email",
      html: `
        <div style="padding:40px;font-family:Inter,Arial,sans-serif;background:#02070c;color:#e5edf5;max-width:600px;margin:0 auto;border-radius:16px;border:1px solid rgba(255,255,255,0.08);">
          <div style="font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#67f0ff;font-weight:700;margin-bottom:16px;">A1 Marine Care</div>
          <h1 style="font-size:24px;color:#ffffff;margin:0 0 16px;">Test Email</h1>
          <p style="color:rgba(229,237,245,0.72);line-height:1.7;">
            This is a test email sent via the <strong>/api/admin/test-email</strong> endpoint.
            If you received this, your Resend email configuration is working correctly.
          </p>
          <div style="margin-top:24px;padding:16px 20px;background:#07131d;border-radius:12px;border:1px solid rgba(255,255,255,0.08);">
            <div style="font-size:11px;text-transform:uppercase;color:rgba(229,237,245,0.45);margin-bottom:4px;">Configuration</div>
            <div style="font-size:13px;">From: <strong style="color:#ffffff;">${fromEmail}</strong></div>
            <div style="font-size:13px;">To: <strong style="color:#ffffff;">${toEmail}</strong></div>
            <div style="font-size:13px;">Sent at: <strong style="color:#ffffff;">${new Date().toISOString()}</strong></div>
          </div>
        </div>
      `,
    });

    if (response.error) {
      console.error(JSON.stringify({ level: "email_failure", source: "test-email", to: toEmail, from: fromEmail, error: response.error }));
      return NextResponse.json({ success: false, error: response.error.message, resendId: null }, { status: 200 });
    }

    console.log(JSON.stringify({ level: "email_success", source: "test-email", to: toEmail, from: fromEmail, resendId: response.data?.id }));
    return NextResponse.json({ success: true, resendId: response.data?.id, error: null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ level: "email_failure", source: "test-email", to: toEmail, from: fromEmail, error: msg }));
    return NextResponse.json({ success: false, error: msg, resendId: null }, { status: 200 });
  }
}